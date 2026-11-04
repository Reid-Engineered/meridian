use tauri::State;
use crate::{domain::{AppInfo,BookDetail,BookInput,BookQuery,Collection,MetadataResult,Statistics},error::AppResult,metadata,state::AppState};

#[tauri::command] pub fn list_books(state:State<AppState>,query:BookQuery)->AppResult<Vec<BookDetail>>{state.library.list(&query)}
#[tauri::command] pub fn get_book(state:State<AppState>,id:i64)->AppResult<BookDetail>{state.library.get(id)}
#[tauri::command] pub fn create_book(state:State<AppState>,input:BookInput)->AppResult<BookDetail>{state.library.create(&input)}
#[tauri::command] pub fn update_book(state:State<AppState>,id:i64,input:BookInput)->AppResult<BookDetail>{state.library.update(id,&input)}
#[tauri::command] pub fn find_duplicates(state:State<AppState>,input:BookInput,exclude:Option<i64>)->AppResult<Vec<crate::duplicates::DuplicateMatch>>{state.library.duplicates(&input,exclude)}
#[tauri::command] pub fn create_book_copy(state:State<AppState>,source:i64,input:BookInput)->AppResult<BookDetail>{state.library.create_copy(source,&input)}
#[tauri::command] pub async fn merge_book_copies(state:State<'_,AppState>,keep:i64,remove:i64)->AppResult<BookDetail>{
  let library=state.library.clone();let recovery=state.database_path.parent().ok_or(crate::error::AppError::Storage)?.join("recovery");
  tauri::async_runtime::spawn_blocking(move||library.merge_copies(keep,remove,&recovery)).await.map_err(|_|crate::error::AppError::Storage)?
}
#[tauri::command] pub fn delete_book(state:State<AppState>,id:i64)->AppResult<()> {state.library.delete(id)}
#[tauri::command] pub fn list_collections(state:State<AppState>)->AppResult<Vec<Collection>>{state.library.collections()}
#[tauri::command] pub fn create_collection(state:State<AppState>,name:String,description:String)->AppResult<Collection>{state.library.create_collection(&name,&description)}
#[tauri::command] pub fn rename_collection(state:State<AppState>,id:i64,name:String,description:String)->AppResult<Collection>{state.library.rename_collection(id,&name,&description)}
#[tauri::command] pub fn delete_collection(state:State<AppState>,id:i64)->AppResult<()> {state.library.delete_collection(id)}
#[tauri::command] pub fn get_statistics(state:State<AppState>)->AppResult<Statistics>{state.library.statistics()}
#[tauri::command] pub async fn lookup_isbn(isbn:String)->AppResult<MetadataResult>{metadata::lookup_isbn(&isbn).await}
#[tauri::command] pub fn get_app_info(state:State<AppState>)->AppInfo{AppInfo{database_path:state.database_path.display().to_string(),covers_path:state.covers_path.display().to_string(),version:env!("CARGO_PKG_VERSION").into()}}
#[tauri::command] pub fn export_library(state:State<AppState>)->AppResult<String>{state.library.export_catalog()}
#[tauri::command] pub fn create_backup(state:State<AppState>)->AppResult<String>{state.library.backup()}
#[tauri::command] pub fn save_backup(state:State<AppState>,path:String)->AppResult<()> {
  crate::backup::save(&state.library.backup()?,std::path::Path::new(&path))
}
#[tauri::command] pub async fn import_cover(state:State<'_,AppState>,path:String)->AppResult<crate::covers::Imported> {
  let directory=state.covers_path.clone();
  tauri::async_runtime::spawn_blocking(move||crate::covers::import(std::path::Path::new(&path),&directory)).await.map_err(|_|crate::error::AppError::Storage)?
}
#[tauri::command] pub fn read_cover(state:State<AppState>,reference:String)->AppResult<String>{crate::covers::data_url(&state.covers_path,&reference)}
#[tauri::command] pub fn get_cover_storage(state:State<AppState>)->AppResult<crate::covers::Storage>{crate::covers::storage(&state.covers_path)}
#[tauri::command] pub async fn save_portable_backup(state:State<'_,AppState>,path:String)->AppResult<()> {
  let library=state.library.clone();let covers=state.covers_path.clone();
  tauri::async_runtime::spawn_blocking(move||library.save_portable(&covers,std::path::Path::new(&path))).await.map_err(|_|crate::error::AppError::Storage)?
}
#[tauri::command] pub async fn inspect_backup_file(path:String)->AppResult<crate::portable::Inspection> {
  tauri::async_runtime::spawn_blocking(move||crate::portable::inspect(std::path::Path::new(&path))).await.map_err(|_|crate::error::AppError::Storage)?
}
#[tauri::command] pub async fn restore_backup_file(state:State<'_,AppState>,path:String,digest:String)->AppResult<crate::backup::RestoreResult> {
  let library=state.library.clone();let covers=state.covers_path.clone();
  let recovery=state.database_path.parent().ok_or(crate::error::AppError::Storage)?.join("backups");
  tauri::async_runtime::spawn_blocking(move||library.restore_portable(&covers,std::path::Path::new(&path),&digest,&recovery)).await.map_err(|_|crate::error::AppError::Storage)?
}
#[tauri::command] pub fn inspect_backup(json:String)->AppResult<crate::backup::Summary>{crate::backup::inspect(&json)}
#[tauri::command] pub fn restore_backup(state:State<AppState>,json:String)->AppResult<crate::backup::RestoreResult>{
  let parent=state.database_path.parent().ok_or(crate::error::AppError::Storage)?;
  state.library.restore(&json,&state.covers_path,&parent.join("backups"))
}
