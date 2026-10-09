//! Immutable, content-addressed local covers. No original paths enter the catalog.
use std::{fs, io::{Read, Write, Cursor}, path::Path};
use image::{ImageDecoder, ImageFormat, ImageReader};
use sha2::{Digest, Sha256};
use serde::Serialize;
use base64::Engine;
use crate::error::{AppError,AppResult};

pub const PREFIX:&str="meridian-cover:";
pub const MAX_SOURCE:u64=20*1024*1024;
pub const MAX_COVER:u64=512*1024;
pub fn failure(message:&str)->AppError {AppError::InvalidBackup(message.into())}
pub fn digest(bytes:&[u8])->String {format!("{:x}",Sha256::digest(bytes))}
pub fn filename(reference:&str)->AppResult<&str> {
    let name=reference.strip_prefix(PREFIX).ok_or_else(||failure("Not a managed cover reference."))?;
    if name.len()!=68 || !name.ends_with(".jpg") || !name[..64].bytes().all(|b|b.is_ascii_digit() || (b'a'..=b'f').contains(&b)) {
        return Err(failure("Invalid managed cover reference."));
    }
    Ok(name)
}
fn decoded(bytes:&[u8],managed:bool)->AppResult<image::DynamicImage> {
    let format=image::guess_format(bytes).map_err(|_|failure("Choose a valid PNG, JPEG or WebP image."))?;
    if !matches!(format,ImageFormat::Png|ImageFormat::Jpeg|ImageFormat::WebP) || (managed && format!=ImageFormat::Jpeg) {
        return Err(failure("Choose a valid PNG, JPEG or WebP image."));
    }
    let mut limits=image::Limits::default();limits.max_image_width=Some(if managed{600}else{8000});limits.max_image_height=limits.max_image_width;limits.max_alloc=Some(128*1024*1024);
    let mut reader=ImageReader::with_format(Cursor::new(bytes),format);reader.limits(limits);
    let mut decoder=reader.into_decoder().map_err(|_|failure("Image is corrupt or exceeds the supported dimensions."))?;
    let (width,height)=decoder.dimensions();
    if width==0 || height==0 || u64::from(width)*u64::from(height)>24_000_000 {return Err(failure("Image exceeds 24 million pixels."));}
    let orientation=decoder.orientation().map_err(|_|failure("Invalid image orientation."))?;
    let mut image=image::DynamicImage::from_decoder(decoder).map_err(|_|failure("The image could not be decoded."))?;
    image.apply_orientation(orientation);Ok(image)
}
pub fn validate(name:&str,bytes:&[u8])->AppResult<()> {
    filename(&format!("{PREFIX}{name}"))?;
    if bytes.len() as u64>MAX_COVER || digest(bytes)!=name[..64] {return Err(failure("Cover contents do not match their reference."));}
    decoded(bytes,true)?;Ok(())
}
pub fn publish(directory:&Path,name:&str,bytes:&[u8])->AppResult<()> {
    validate(name,bytes)?;fs::create_dir_all(directory)?;
    let path=directory.join(name);
    if path.exists() {
        if read(directory,&format!("{PREFIX}{name}"))?!=bytes {return Err(failure("An existing managed cover has different contents."));}
        return Ok(())
    }
    let mut file=tempfile::NamedTempFile::new_in(directory)?;file.write_all(bytes)?;file.as_file().sync_all()?;
    match file.persist_noclobber(&path) {
        Ok(_)=>Ok(()),
        Err(error) if error.error.kind()==std::io::ErrorKind::AlreadyExists => {
            if read(directory,&format!("{PREFIX}{name}"))?==bytes {Ok(())}else{Err(failure("Cover filename collision."))}
        },
        Err(error)=>Err(error.error.into()),
    }
}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Imported {pub reference:String,pub bytes:u64,pub width:u32,pub height:u32}
pub fn import(source:&Path,directory:&Path)->AppResult<Imported> {
    let file=fs::File::open(source)?;
    if !file.metadata()?.is_file() {return Err(failure("Choose an image file."));}
    let mut bytes=Vec::new();file.take(MAX_SOURCE+1).read_to_end(&mut bytes)?;
    if bytes.len() as u64>MAX_SOURCE {return Err(failure("Cover images must be 20 MiB or smaller."));}
    let image=decoded(&bytes,false)?;
    let image=if image.width()>600 || image.height()>600 {image.resize(600,600,image::imageops::FilterType::Lanczos3)}else{image};
    // Composite transparency over white before JPEG conversion; strip source metadata.
    let mut rgba=image.to_rgba8();
    for pixel in rgba.pixels_mut() {let alpha=u32::from(pixel[3]);for channel in &mut pixel.0[..3] {*channel=((u32::from(*channel)*alpha+255*(255-alpha)+127)/255) as u8;}pixel[3]=255;}
    let rgb=image::DynamicImage::ImageRgba8(rgba).to_rgb8();
    let mut encoded=Vec::new();image::codecs::jpeg::JpegEncoder::new_with_quality(&mut encoded,82).encode_image(&rgb).map_err(|_|failure("The cover could not be encoded."))?;
    let name=format!("{}.jpg",digest(&encoded));publish(directory,&name,&encoded)?;
    Ok(Imported {reference:format!("{PREFIX}{name}"),bytes:encoded.len() as u64,width:rgb.width(),height:rgb.height()})
}
pub fn read(directory:&Path,reference:&str)->AppResult<Vec<u8>> {
    let name=filename(reference)?;let path=directory.join(name);
    if fs::symlink_metadata(&path)?.file_type().is_symlink() {return Err(failure("Managed covers cannot be symbolic links."));}
    let mut bytes=Vec::new();fs::File::open(path)?.take(MAX_COVER+1).read_to_end(&mut bytes)?;validate(name,&bytes)?;Ok(bytes)
}
pub fn data_url(directory:&Path,reference:&str)->AppResult<String> {Ok(format!("data:image/jpeg;base64,{}",base64::engine::general_purpose::STANDARD.encode(read(directory,reference)?)))}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Storage {pub files:usize,pub bytes:u64}
pub fn storage(directory:&Path)->AppResult<Storage> {
    let mut total=Storage{files:0,bytes:0};
    for entry in fs::read_dir(directory)? {let entry=entry?;if !entry.file_type()?.is_file(){continue}let name=entry.file_name();if filename(&format!("{PREFIX}{}",name.to_string_lossy())).is_ok(){total.files+=1;total.bytes+=entry.metadata()?.len();}}
    Ok(total)
}
