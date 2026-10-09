//! Bounded, staged ZIP archives. Never extract names provided by an archive.
use std::{collections::BTreeSet,fs::{self,File},io::{Read,Write,Seek,SeekFrom},path::Path};
use rusqlite::{Connection,TransactionBehavior};
use sha2::{Digest,Sha256};
use serde::Serialize;
use zip::{ZipArchive,ZipWriter,write::SimpleFileOptions,CompressionMethod};
use crate::{backup,covers,error::AppResult};
const MAX_ARCHIVE:u64=2*1024*1024*1024;
const MAX_ENTRIES:usize=100_001;
fn zip_error(_:zip::result::ZipError)->crate::error::AppError {covers::failure("The portable backup is invalid or unsupported.")}

#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Inspection {pub digest:String,pub summary:backup::Summary,pub cover_files:usize,pub cover_bytes:u64,pub external_covers:usize}
struct Staged {directory:tempfile::TempDir,json:String,digest:String,names:BTreeSet<String>,cover_bytes:u64,external_covers:usize}
fn references(json:&str)->AppResult<(BTreeSet<String>,usize)> {
    let backup=backup::validated(json)?;let mut names=BTreeSet::new();let mut external=0;
    for reference in backup::cover_references(&backup) {
        if reference.starts_with(covers::PREFIX) {names.insert(covers::filename(&reference)?.to_owned());}
        else if !reference.is_empty(){external+=1;}
    }
    Ok((names,external))
}
fn file_digest(file:&mut File)->AppResult<String> {
    file.seek(SeekFrom::Start(0))?;let mut hash=Sha256::new();let mut buffer=[0u8;65536];
    loop {let count=file.read(&mut buffer)?;if count==0{break}hash.update(&buffer[..count]);}
    file.seek(SeekFrom::Start(0))?;Ok(format!("{:x}",hash.finalize()))
}
fn stage(path:&Path)->AppResult<Staged> {
    let source=File::open(path)?;
    if !source.metadata()?.is_file() || source.metadata()?.len()>MAX_ARCHIVE {return Err(covers::failure("Backups must be files no larger than 2 GiB."));}
    let directory=tempfile::tempdir()?;let mut copied=tempfile::tempfile()?;
    let count=std::io::copy(&mut source.take(MAX_ARCHIVE+1),&mut copied)?;
    if count>MAX_ARCHIVE {return Err(covers::failure("Backup exceeds 2 GiB."));}
    let digest=file_digest(&mut copied)?;
    let mut signature=[0u8;4];let read=copied.read(&mut signature)?;copied.seek(SeekFrom::Start(0))?;
    if read<4 || signature!=*b"PK\x03\x04" {
        let mut json=String::new();copied.take(backup::MAX_BYTES as u64+1).read_to_string(&mut json)?;
        let (names,external_covers)=references(&json)?;
        if !names.is_empty(){return Err(covers::failure("This JSON backup has managed cover references but no images. Choose its portable ZIP backup instead."));}
        return Ok(Staged{directory,json,digest,names,cover_bytes:0,external_covers})
    }
    let mut archive=ZipArchive::new(copied).map_err(zip_error)?;
    if archive.len()>MAX_ENTRIES {return Err(covers::failure("Backup has too many entries."));}
    let mut seen=BTreeSet::new();let mut names=BTreeSet::new();let mut json=None;let mut total=0u64;let mut cover_bytes=0u64;
    for index in 0..archive.len() {
        let mut entry=archive.by_index(index).map_err(zip_error)?;
        let name=entry.name().to_owned();
        if !seen.insert(name.clone()) || entry.is_dir() || entry.unix_mode().map(|mode|mode & 0o170000==0o120000).unwrap_or(false) {
            return Err(covers::failure("Backup contains duplicate entries, directories or symbolic links."));
        }
        let limit=if name=="catalog.json" {backup::MAX_BYTES as u64}else {
            let cover=name.strip_prefix("covers/").ok_or_else(||covers::failure("Unexpected file in portable backup."))?;
            covers::filename(&format!("{}{cover}",covers::PREFIX))?;covers::MAX_COVER
        };
        total=total.checked_add(entry.size()).ok_or_else(||covers::failure("Backup is too large."))?;
        if entry.size()>limit || total>MAX_ARCHIVE {return Err(covers::failure("Backup exceeds its extraction limits."));}
        let expected=entry.size();let mut bytes=Vec::new();(&mut entry).take(limit+1).read_to_end(&mut bytes)?;
        if bytes.len() as u64!=expected || bytes.len() as u64>limit {return Err(covers::failure("Incomplete or oversized archive entry."));}
        if name=="catalog.json" {json=Some(String::from_utf8(bytes).map_err(|_|covers::failure("Invalid catalog text."))?);}
        else {
            let cover=&name[7..];covers::validate(cover,&bytes)?;cover_bytes+=bytes.len() as u64;
            fs::write(directory.path().join(cover),&bytes)?;names.insert(cover.to_owned());
        }
    }
    let json=json.ok_or_else(||covers::failure("Backup is missing catalog.json."))?;
    let (required,external_covers)=references(&json)?;
    if required!=names {return Err(covers::failure("Backup has missing or unreferenced managed cover images."));}
    Ok(Staged{directory,json,digest,names,cover_bytes,external_covers})
}
fn inspection(staged:&Staged)->AppResult<Inspection> {Ok(Inspection{digest:staged.digest.clone(),summary:backup::inspect(&staged.json)?,cover_files:staged.names.len(),cover_bytes:staged.cover_bytes,external_covers:staged.external_covers})}
pub fn inspect(path:&Path)->AppResult<Inspection> {inspection(&stage(path)?)}
pub fn restore_json(db:&mut Connection,covers_dir:&Path,json:&str,recovery_dir:&Path)->AppResult<backup::RestoreResult> {
    // Compatibility command: JSON references must resolve locally. Its recovery
    // backup is still portable, so imported images cannot be omitted from recovery.
    let directory=tempfile::tempdir()?;let path=directory.path().join("legacy.zip");
    write_archive(json,covers_dir,&path)?;let review=inspect(&path)?;
    restore(db,covers_dir,&path,&review.digest,recovery_dir)
}

fn write_archive(json:&str,covers_dir:&Path,path:&Path)->AppResult<()> {
    let (names,_)=references(json)?;
    if names.len()+1>MAX_ENTRIES {return Err(covers::failure("Too many cover files for one backup."));}
    let parent=path.parent().ok_or_else(||covers::failure("Choose a backup destination."))?;
    let mut temporary=tempfile::NamedTempFile::new_in(parent)?;
    {
        let mut archive=ZipWriter::new(temporary.as_file_mut());let options=SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        archive.start_file("catalog.json",options).map_err(zip_error)?;archive.write_all(json.as_bytes())?;
        let mut total=json.len() as u64;
        for name in names {
            let bytes=covers::read(covers_dir,&format!("{}{name}",covers::PREFIX))?;total+=bytes.len() as u64;
            if total>MAX_ARCHIVE-16*1024*1024 {return Err(covers::failure("Backup exceeds 2 GiB."));}
            archive.start_file(format!("covers/{name}"),options).map_err(zip_error)?;archive.write_all(&bytes)?;
        }
        archive.finish().map_err(zip_error)?;
    }
    temporary.as_file().sync_all()?;
    temporary.persist_noclobber(path).map_err(|e|if e.error.kind()==std::io::ErrorKind::AlreadyExists {covers::failure("That file already exists. Choose a new backup filename.")}else{e.error.into()})?;Ok(())
}
pub fn save(db:&mut Connection,covers_dir:&Path,path:&Path)->AppResult<()> {
    let tx=db.transaction()?;let json=backup::snapshot_json(&tx)?;write_archive(&json,covers_dir,path)?;tx.commit()?;Ok(())
}
pub fn restore(db:&mut Connection,covers_dir:&Path,path:&Path,digest:&str,recovery_dir:&Path)->AppResult<backup::RestoreResult> {
    let staged=stage(path)?;
    if digest!=staged.digest {return Err(covers::failure("The backup changed after review. Choose it again before restoring."));}
    let incoming=backup::validated(&staged.json)?;
    let tx=db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let previous=backup::snapshot_json(&tx)?;fs::create_dir_all(recovery_dir)?;
    let recovery=recovery_dir.join(format!("before-restore-{}.meridian.zip",uuid::Uuid::new_v4()));
    write_archive(&previous,covers_dir,&recovery)?; // Full catalog AND images, before any catalog writes.
    // Publish immutable images first; never replace or remove an existing image.
    // An interrupted/failed restore can leave harmless unused files, never missing old assets.
    for name in &staged.names {covers::publish(covers_dir,name,&fs::read(staged.directory.path().join(name))?)?;}
    backup::apply(&tx,&incoming)?;tx.commit()?;
    Ok(backup::RestoreResult{summary:backup::summary(&incoming),recovery_path:recovery.display().to_string()})
}
