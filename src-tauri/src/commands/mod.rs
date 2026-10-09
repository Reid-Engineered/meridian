use tauri::State;
use crate::{domain::{AppInfo,BookDetail,BookInput,BookQuery,Collection,MetadataResult,Statistics},error::AppResult,metadata,state::AppState};

#[tauri::command] pub fn list_books(state:State<AppState>,query:BookQuery)->AppResult<Vec<BookDetail>>{state.library.list(&query)}
#[tauri::command] pub fn get_book(state:State<AppState>,id:i64)->AppResult<BookDetail>{state.library.get(id)}
#[tauri::command] pub fn create_book(state:State<AppState>,input:BookInput)->AppResult<BookDetail>{state.library.create(&input)}
#[tauri::command] pub fn update_book(state:State<AppState>,id:i64,input:BookInput)->AppResult<BookDetail>{state.library.update(id,&input)}
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
#[tauri::command] pub fn inspect_backup(json:String)->AppResult<crate::backup::Summary>{crate::backup::inspect(&json)}
#[tauri::command] pub fn restore_backup(state:State<AppState>,json:String)->AppResult<crate::backup::RestoreResult>{
  let parent=state.database_path.parent().ok_or(crate::error::AppError::Storage)?;
  state.library.restore(&json,&parent.join("backups"))
}
