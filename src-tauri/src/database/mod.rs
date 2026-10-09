use rusqlite::Connection;
use std::path::Path;
use crate::error::{AppError, AppResult};

pub fn open(path:&Path)->AppResult<Connection>{
    let conn=Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
    migrate(&conn)?; Ok(conn)
}
#[cfg(test)]
pub fn memory()->AppResult<Connection>{let conn=Connection::open_in_memory()?;conn.execute_batch("PRAGMA foreign_keys=ON;")?;migrate(&conn)?;Ok(conn)}
fn migrate(conn:&Connection)->AppResult<()> {
    initialize(conn)
}
pub(crate) fn initialize(conn:&Connection)->AppResult<()> {
    // Lock before reading the version so simultaneous launches cannot race.
    // Dropping the transaction on any error rolls back both DDL and its marker.
    let tx = rusqlite::Transaction::new_unchecked(conn, rusqlite::TransactionBehavior::Immediate)?;
    tx.execute_batch("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);")?;
    let version:Option<i64>=tx.query_row("SELECT max(version) FROM schema_migrations",[],|r|r.get(0))?;
    let version = version.unwrap_or(0);
    if !(0..=1).contains(&version) { return Err(AppError::UnsupportedSchema(version)); }
    if version < 1 {
        tx.execute_batch(include_str!("../../migrations/001_initial.sql"))?;
        tx.execute("INSERT INTO schema_migrations(version) VALUES(1)",[])?;
    }
    tx.commit()?;
    Ok(())
}
