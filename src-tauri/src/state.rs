use std::path::PathBuf;
use crate::services::LibraryService;
pub struct AppState { pub library:LibraryService,pub database_path:PathBuf,pub covers_path:PathBuf }
