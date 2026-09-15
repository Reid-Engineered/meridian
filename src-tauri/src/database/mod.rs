use rusqlite::Connection;
use std::path::Path;
use crate::error::AppResult;

pub fn open(path:&Path)->AppResult<Connection>{
    let conn=Connection::open(path)?;
    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
    migrate(&conn)?; Ok(conn)
}
#[cfg(test)]
pub fn memory()->AppResult<Connection>{let conn=Connection::open_in_memory()?;conn.execute_batch("PRAGMA foreign_keys=ON;")?;migrate(&conn)?;Ok(conn)}
fn migrate(conn:&Connection)->AppResult<()> {
    conn.execute_batch("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);")?;
    let version:Option<i64>=conn.query_row("SELECT max(version) FROM schema_migrations",[],|r|r.get(0))?;
    if version.unwrap_or(0)<1 { conn.execute_batch(include_str!("../../migrations/001_initial.sql"))?; conn.execute("INSERT OR IGNORE INTO schema_migrations(version) VALUES(1)",[])?; }
    Ok(())
}
