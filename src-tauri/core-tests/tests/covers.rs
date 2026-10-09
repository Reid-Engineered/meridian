use meridian_core_tests::{covers,portable,backup,database,domain::{BookInput,BookQuery},repositories::LibraryRepository};
use std::{fs,path::Path,io::{Write,Cursor}};
use image::{DynamicImage,RgbaImage,Rgba,ImageFormat};
use zip::{ZipWriter,write::SimpleFileOptions};

fn source(path:&Path,format:ImageFormat,width:u32,height:u32){
    let image=DynamicImage::ImageRgba8(RgbaImage::from_fn(width,height,|x,y|Rgba([(x%251)as u8,(y%251)as u8,80,if x==0{0}else{255}])));
    let mut bytes=Cursor::new(Vec::new());
    let image=if format==ImageFormat::Jpeg{DynamicImage::ImageRgb8(image.to_rgb8())}else{image};
    image.write_to(&mut bytes,format).unwrap();fs::write(path,bytes.into_inner()).unwrap();
}
fn db(reference:Option<&str>)->rusqlite::Connection {
    let mut db=database::open(Path::new(":memory:")).unwrap();
    let collection=LibraryRepository::create_collection(&db,"星","Unicode shelf").unwrap();
    let input:BookInput=serde_json::from_value(serde_json::json!({"title":"Cover round trip","authors":["Doe, Jane","李白"],"format":"Paperback","status":"Reading","currentPage":42,"tags":["owned"],"collectionIds":[collection.id],"coverUrl":reference})).unwrap();
    let book=LibraryRepository::create(&mut db,&input).unwrap();
    db.execute("INSERT INTO reading_records(copy_id,status,rating) VALUES(?1,'Finished',5)",[book.id]).unwrap();db
}
fn zip(path:&Path,entries:Vec<(String,Vec<u8>)>){let mut zip=ZipWriter::new(fs::File::create(path).unwrap());for(name,bytes)in entries{zip.start_file(name,SimpleFileOptions::default()).unwrap();zip.write_all(&bytes).unwrap();}zip.finish().unwrap();}

#[test] fn png_jpeg_webp_are_resized_deduplicated_and_independent_of_source_paths(){
    let root=tempfile::tempdir().unwrap();let directory=root.path().join("covers");
    for (index,format) in [ImageFormat::Png,ImageFormat::Jpeg,ImageFormat::WebP].into_iter().enumerate(){
        let path=root.path().join(format!("{index}.misleading-extension"));source(&path,format,800,1200);
        let first=covers::import(&path,&directory).unwrap();let second=covers::import(&path,&directory).unwrap();assert_eq!(first.reference,second.reference);
        assert_eq!((first.width,first.height),(400,600));assert!(first.bytes<=covers::MAX_COVER);
        fs::remove_file(path).unwrap();let bytes=covers::read(&directory,&first.reference).unwrap();assert_eq!(bytes.len()as u64,first.bytes);
    }
    let storage=covers::storage(&directory).unwrap();assert!(storage.files>=2 && storage.files<=3);assert!(storage.bytes>0);
}
#[test] fn corrupt_unsupported_oversized_and_overdimension_images_leave_no_files(){
    let root=tempfile::tempdir().unwrap();let directory=root.path().join("covers");
    for bytes in [b"not an image".as_slice(),b"GIF89a\0\0\0\0".as_slice(),b"\x89PNG\r\n\x1a\ntruncated".as_slice()]{let path=root.path().join("bad.png");fs::write(&path,bytes).unwrap();assert!(covers::import(&path,&directory).is_err());}
    let huge=root.path().join("huge.png");source(&huge,ImageFormat::Png,8001,1);assert!(covers::import(&huge,&directory).is_err());
    fs::File::create(&huge).unwrap().set_len(covers::MAX_SOURCE+1).unwrap();assert!(covers::import(&huge,&directory).is_err());assert!(!directory.exists());
}
#[test] fn transparent_pixels_are_white_and_exif_orientation_is_applied(){
    let root=tempfile::tempdir().unwrap();let path=root.path().join("transparent.png");let directory=root.path().join("covers");
    source(&path,ImageFormat::Png,1,1);let imported=covers::import(&path,&directory).unwrap();let rgb=image::load_from_memory(&covers::read(&directory,&imported.reference).unwrap()).unwrap().to_rgb8();assert!(rgb.get_pixel(0,0).0.iter().all(|&x|x>245));
    source(&path,ImageFormat::Jpeg,80,160);let original=fs::read(&path).unwrap();
    let exif=b"Exif\0\0II\x2a\0\x08\0\0\0\x01\0\x12\x01\x03\0\x01\0\0\0\x06\0\0\0\0\0\0\0";
    let mut jpeg=original[..2].to_vec();jpeg.extend_from_slice(b"\xff\xe1");jpeg.extend_from_slice(&((exif.len()+2)as u16).to_be_bytes());jpeg.extend_from_slice(exif);jpeg.extend_from_slice(&original[2..]);fs::write(&path,jpeg).unwrap();
    let rotated=covers::import(&path,&directory).unwrap();assert_eq!((rotated.width,rotated.height),(160,80));
}
#[test] fn invalid_references_and_tampered_existing_files_are_rejected_without_overwrite(){
    let root=tempfile::tempdir().unwrap();let directory=root.path().join("covers");let path=root.path().join("source");source(&path,ImageFormat::Png,10,20);
    let cover=covers::import(&path,&directory).unwrap();for reference in ["meridian-cover:../source","meridian-cover:C:/source","file:///source"]{assert!(covers::read(&directory,reference).is_err());}
    let destination=directory.join(covers::filename(&cover.reference).unwrap());fs::write(&destination,b"corrupt").unwrap();assert!(covers::import(&path,&directory).is_err());assert_eq!(fs::read(&destination).unwrap(),b"corrupt");
}
#[test] fn portable_restore_into_empty_storage_preserves_catalog_images_history_and_recovery(){
    let root=tempfile::tempdir().unwrap();let source_file=root.path().join("source.png");source(&source_file,ImageFormat::Png,400,900);
    let source_covers=root.path().join("source-covers");let image=covers::import(&source_file,&source_covers).unwrap();let pixels=covers::read(&source_covers,&image.reference).unwrap();let mut original=db(Some(&image.reference));let expected=backup::export(&mut original).unwrap();
    let archive=root.path().join("portable.zip");portable::save(&mut original,&source_covers,&archive).unwrap();fs::remove_file(source_file).unwrap();
    let inspection=portable::inspect(&archive).unwrap();assert_eq!(inspection.cover_files,1);assert_eq!(inspection.cover_bytes,image.bytes);assert_eq!(inspection.summary.reading_records,2);
    let target_covers=root.path().join("target-covers");fs::create_dir(&target_covers).unwrap();let target_db=root.path().join("library.db");let mut target=database::open(&target_db).unwrap();
    let result=portable::restore(&mut target,&target_covers,&archive,&inspection.digest,&root.path().join("recovery")).unwrap();assert_eq!(backup::export(&mut target).unwrap(),expected);assert_eq!(covers::read(&target_covers,&image.reference).unwrap(),pixels);drop(target);
    let reopened=database::open(&target_db).unwrap();assert_eq!(LibraryRepository::list(&reopened,&BookQuery::default()).unwrap().len(),1);drop(reopened);
    let recovery=portable::inspect(Path::new(&result.recovery_path)).unwrap();let mut reverted=database::open(Path::new(":memory:")).unwrap();portable::restore(&mut reverted,&target_covers,Path::new(&result.recovery_path),&recovery.digest,&root.path().join("again")).unwrap();assert_eq!(LibraryRepository::list(&reverted,&BookQuery::default()).unwrap().len(),0);
}
#[test] fn recovery_archive_contains_previous_images_and_failed_restore_rolls_back(){
    let root=tempfile::tempdir().unwrap();let file=root.path().join("source.png");source(&file,ImageFormat::Png,80,160);let directory=root.path().join("covers");let image=covers::import(&file,&directory).unwrap();let mut live=db(Some(&image.reference));let before=backup::export(&mut live).unwrap();
    let archive=root.path().join("incoming.zip");portable::save(&mut db(None),&directory,&archive).unwrap();let review=portable::inspect(&archive).unwrap();
    live.execute_batch("CREATE TRIGGER fail_restore BEFORE INSERT ON works BEGIN SELECT RAISE(ABORT,'injected failure');END;").unwrap();
    let recovery_dir=root.path().join("recovery");assert!(portable::restore(&mut live,&directory,&archive,&review.digest,&recovery_dir).is_err());assert_eq!(backup::export(&mut live).unwrap(),before);assert!(covers::read(&directory,&image.reference).is_ok());
    let recovery=fs::read_dir(&recovery_dir).unwrap().next().unwrap().unwrap().path();let inspection=portable::inspect(&recovery).unwrap();assert_eq!(inspection.cover_files,1);
    let restored_covers=root.path().join("recovered-images");fs::create_dir(&restored_covers).unwrap();let mut recovered=database::open(Path::new(":memory:")).unwrap();portable::restore(&mut recovered,&restored_covers,&recovery,&inspection.digest,&root.path().join("recovery-2")).unwrap();assert_eq!(backup::export(&mut recovered).unwrap(),before);assert!(covers::read(&restored_covers,&image.reference).is_ok());
}
#[test] fn missing_tampered_unexpected_and_traversal_archive_entries_never_change_live_data(){
    let root=tempfile::tempdir().unwrap();let image_path=root.path().join("source");source(&image_path,ImageFormat::Png,10,20);let directory=root.path().join("covers");let image=covers::import(&image_path,&directory).unwrap();let name=covers::filename(&image.reference).unwrap();let json=backup::export(&mut db(Some(&image.reference))).unwrap();
    let mut live=db(None);let before=backup::export(&mut live).unwrap();
    for entries in [vec![("catalog.json".into(),json.as_bytes().to_vec())],vec![("catalog.json".into(),json.as_bytes().to_vec()),(format!("covers/{name}"),b"bad".to_vec())],vec![("../outside".into(),b"attack".to_vec())],vec![("covers/../../outside".into(),b"attack".to_vec())]] {
        let path=root.path().join("bad.zip");zip(&path,entries);assert!(portable::inspect(&path).is_err());assert!(portable::restore(&mut live,&directory,&path,"bad",&root.path().join("recovery")).is_err());assert_eq!(backup::export(&mut live).unwrap(),before);
    }
    assert!(!root.path().join("recovery").exists());assert!(!root.path().join("outside").exists());
}
#[test] fn changed_review_and_failed_safety_write_preserve_database_and_covers(){
    let root=tempfile::tempdir().unwrap();let directory=root.path().join("covers");fs::create_dir(&directory).unwrap();let mut live=db(None);let before=backup::export(&mut live).unwrap();
    let path=root.path().join("backup.zip");portable::save(&mut live,&directory,&path).unwrap();let review=portable::inspect(&path).unwrap();
    assert!(portable::restore(&mut live,&directory,&path,"different-digest",&root.path().join("recovery")).is_err());assert!(!root.path().join("recovery").exists());
    let obstruction=root.path().join("obstruction");fs::write(&obstruction,b"file").unwrap();assert!(portable::restore(&mut live,&directory,&path,&review.digest,&obstruction).is_err());assert_eq!(backup::export(&mut live).unwrap(),before);
    assert!(portable::save(&mut live,&directory,&path).is_err());assert_eq!(portable::inspect(&path).unwrap().digest,review.digest);
}
#[test] fn legacy_json_restore_saves_complete_recovery_and_requires_local_managed_images(){
    let root=tempfile::tempdir().unwrap();let path=root.path().join("source");source(&path,ImageFormat::Png,10,20);let directory=root.path().join("covers");let image=covers::import(&path,&directory).unwrap();
    let mut live=db(Some(&image.reference));let before=backup::export(&mut live).unwrap();let empty=backup::export(&mut database::open(Path::new(":memory:")).unwrap()).unwrap();
    let result=portable::restore_json(&mut live,&directory,&empty,&root.path().join("recovery")).unwrap();assert_eq!(portable::inspect(Path::new(&result.recovery_path)).unwrap().cover_files,1);
    let missing=root.path().join("missing-images");assert!(portable::restore_json(&mut live,&missing,&before,&root.path().join("failed")).is_err());assert!(!root.path().join("failed").exists());assert_eq!(LibraryRepository::list(&live,&BookQuery::default()).unwrap().len(),0);
}
