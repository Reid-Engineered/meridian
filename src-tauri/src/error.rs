use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("{0}")] InvalidOperation(String),
    #[error("{0}")] InvalidBackup(String),
    #[error("Database schema version {0} is not supported by this version of Meridian. Open it with a compatible application version.")] UnsupportedSchema(i64),
    #[error("The library database could not complete that operation.")] Database(#[from] rusqlite::Error),
    #[error("A title is required.")] MissingTitle,
    #[error("That book is no longer in your library.")] NotFound,
    #[error("That ISBN does not appear to be valid.")] InvalidIsbn,
    #[error("Book metadata is unavailable right now. You can continue entering details manually.")] MetadataUnavailable,
    #[error("A local file operation failed.")] Io(#[from] std::io::Error),
    #[error("The backup could not be created.")] Serialization(#[from] serde_json::Error),
    #[error("Application storage could not be initialized.")] Storage,
}
impl Serialize for AppError { fn serialize<S>(&self, serializer:S)->Result<S::Ok,S::Error> where S:serde::Serializer { serializer.serialize_str(&self.to_string()) } }
pub type AppResult<T> = Result<T,AppError>;
