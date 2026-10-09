//! Lossless schema-1 database snapshots. Cover file contents are intentionally separate.
use std::{collections::BTreeMap, fs::{self, OpenOptions}, io::Write, path::Path};
use rusqlite::{types::{Value, ValueRef}, Connection, TransactionBehavior};
use serde::{Deserialize, Serialize};
use crate::{database, error::{AppError, AppResult}};

// Dependency order; all SQL identifiers come from this list or the trusted schema.
const TABLES: &[&str] = &["works", "authors", "work_authors", "editions", "library_copies",
    "reading_records", "tags", "copy_tags", "collections", "collection_copies", "sqlite_sequence"];
pub const MAX_BYTES: usize = 64 * 1024 * 1024;

#[derive(Serialize, Deserialize)]
#[serde(rename_all="camelCase", deny_unknown_fields)]
pub(crate) struct Backup { format: String, version: u32, schema_version: u32, tables: BTreeMap<String, Table> }
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Table { columns: Vec<String>, rows: Vec<Vec<serde_json::Value>> }
#[derive(Debug, Serialize)]
#[serde(rename_all="camelCase")]
pub struct Summary { pub books: usize, pub collections: usize, pub reading_records: usize }
#[derive(Debug, Serialize)]
#[serde(rename_all="camelCase")]
pub struct RestoreResult { pub summary: Summary, pub recovery_path: String }

fn invalid(message: impl Into<String>) -> AppError { AppError::InvalidBackup(message.into()) }
fn columns(db: &Connection, table: &str) -> AppResult<Vec<(String,String)>> {
    Ok(db.prepare(&format!("PRAGMA table_info({table})"))?
        .query_map([], |r| Ok((r.get(1)?,r.get(2)?)))?.collect::<Result<_,_>>()?)
}
fn snapshot(db: &Connection) -> AppResult<Backup> {
    let schema: i64 = db.query_row("SELECT max(version) FROM schema_migrations", [], |r| r.get(0))?;
    if schema != 1 { return Err(AppError::UnsupportedSchema(schema)); }
    let mut tables = BTreeMap::new();
    for &name in TABLES {
        let columns = columns(db,name)?.into_iter().map(|c|c.0).collect::<Vec<_>>();
        let mut statement = db.prepare(&format!("SELECT * FROM {name} ORDER BY {}", columns.join(",")))?;
        let mut cursor = statement.query([])?;
        let mut rows = Vec::new();
        while let Some(row) = cursor.next()? {
            let mut values = Vec::new();
            for index in 0..columns.len() {
                values.push(match row.get_ref(index)? {
                    ValueRef::Null => serde_json::Value::Null,
                    ValueRef::Integer(n) => n.into(),
                    ValueRef::Real(n) => serde_json::Number::from_f64(n).ok_or_else(||invalid("Non-finite number in library."))?.into(),
                    ValueRef::Text(s) => std::str::from_utf8(s).map_err(|_|invalid("Invalid text in library."))?.into(),
                    ValueRef::Blob(_) => return Err(invalid("Unexpected binary data in library.")),
                });
            }
            rows.push(values);
        }
        tables.insert(name.into(),Table {columns,rows});
    }
    Ok(Backup {format:"meridian-database".into(),version:2,schema_version:1,tables})
}
pub fn export(db: &mut Connection) -> AppResult<String> {
    let tx = db.transaction()?; // One read snapshot, including commits still in WAL.
    let json = serde_json::to_string_pretty(&snapshot(&tx)?)?;
    tx.commit()?;
    if json.len()>MAX_BYTES { return Err(invalid("Backup exceeds the supported 64 MiB limit.")); }
    Ok(json)
}
pub(crate) fn apply(db: &Connection, backup: &Backup) -> AppResult<()> {
    for &table in TABLES.iter().rev() { db.execute(&format!("DELETE FROM {table}"),[])?; }
    for &name in TABLES {
        let table = &backup.tables[name];
        // Inserting AUTOINCREMENT rows recreates sequences; replace them with the saved counters.
        if name=="sqlite_sequence" { db.execute("DELETE FROM sqlite_sequence",[])?; }
        let expected = columns(db,name)?;
        if table.columns != expected.iter().map(|c|c.0.clone()).collect::<Vec<_>>() {
            return Err(invalid(format!("Unexpected columns in {name}.")));
        }
        let placeholders=vec!["?";expected.len()].join(",");
        let mut insert=db.prepare(&format!("INSERT INTO {name} ({}) VALUES ({placeholders})",table.columns.join(",")))?;
        for row in &table.rows {
            if row.len()!=expected.len() { return Err(invalid(format!("Incomplete row in {name}."))); }
            if expected[0].0=="id" && !row[0].is_i64() { return Err(invalid(format!("Missing identifier in {name}."))); }
            let values=row.iter().zip(&expected).map(|(value,(_,kind))| match (value,kind.as_str()) {
                (serde_json::Value::Null,_) => Ok(Value::Null),
                (serde_json::Value::String(s),"TEXT"|"") => Ok(Value::Text(s.clone())),
                (serde_json::Value::Number(n),"INTEGER"|"") if n.is_i64() => Ok(Value::Integer(n.as_i64().unwrap())),
                (serde_json::Value::Number(n),"REAL"|"" ) => n.as_f64().filter(|n|n.is_finite()).map(Value::Real).ok_or_else(||invalid("Invalid numeric value.")),
                _ => Err(invalid(format!("Invalid value type in {name}."))),
            }).collect::<AppResult<Vec<_>>>()?;
            insert.execute(rusqlite::params_from_iter(values))?;
        }
    }
    if db.prepare("PRAGMA foreign_key_check")?.exists([])? { return Err(invalid("Backup has broken relationships.")); }
    let integrity:String=db.query_row("PRAGMA integrity_check",[],|r|r.get(0))?;
    if integrity!="ok" { return Err(invalid("Backup failed database integrity checks.")); }
    Ok(())
}
pub(crate) fn validated(json: &str) -> AppResult<Backup> {
    if json.len()>MAX_BYTES { return Err(invalid("Backup exceeds the supported 64 MiB limit.")); }
    let backup:Backup=serde_json::from_str(json).map_err(|_|invalid("Choose a version-2 Meridian database backup. Legacy catalog exports and browser previews cannot be restored."))?;
    if backup.format!="meridian-database" || backup.version!=2 || backup.schema_version!=1 {
        return Err(invalid("Unsupported backup format or schema version."));
    }
    if backup.tables.len()!=TABLES.len() || TABLES.iter().any(|name|!backup.tables.contains_key(*name)) {
        return Err(invalid("Backup has missing or unknown tables."));
    }
    let mut sequences=std::collections::BTreeSet::new();
    for row in &backup.tables["sqlite_sequence"].rows {
        let name=row.first().and_then(|v|v.as_str()).ok_or_else(||invalid("Invalid sequence name."))?;
        let sequence=row.get(1).and_then(|v|v.as_i64()).ok_or_else(||invalid("Invalid sequence counter."))?;
        if !["works","authors","editions","library_copies","reading_records","tags","collections"].contains(&name)
            || !sequences.insert(name) || sequence<0 { return Err(invalid("Invalid sequence counter.")); }
        let max=backup.tables[name].rows.iter().filter_map(|r|r.first().and_then(|v|v.as_i64())).max().unwrap_or(0);
        if sequence<max { return Err(invalid("Sequence counter is below an existing identifier.")); }
    }
    let mut staged=Connection::open_in_memory()?;
    staged.execute_batch("PRAGMA foreign_keys=ON;")?;
    database::initialize(&staged)?;
    let tx=staged.transaction()?;
    apply(&tx,&backup).map_err(|error|invalid(format!("Backup validation failed: {error}")))?;
    tx.commit()?;
    Ok(backup)
}
pub(crate) fn summary(backup:&Backup)->Summary { Summary {books:backup.tables["library_copies"].rows.len(),collections:backup.tables["collections"].rows.len(),reading_records:backup.tables["reading_records"].rows.len()} }
pub(crate) fn snapshot_json(db:&Connection)->AppResult<String> {
    let json=serde_json::to_string_pretty(&snapshot(db)?)?;
    if json.len()>MAX_BYTES {return Err(invalid("Catalog exceeds the supported 64 MiB limit."));}Ok(json)
}
pub(crate) fn cover_references(backup:&Backup)->Vec<String> {
    let table=&backup.tables["editions"];
    let index=table.columns.iter().position(|c|c=="cover_url").unwrap();
    table.rows.iter().filter_map(|r|r[index].as_str().map(str::to_owned)).collect()
}
pub fn inspect(json:&str)->AppResult<Summary> { Ok(summary(&validated(json)?)) }
pub fn save(json:&str,path:&Path)->AppResult<()> {
    // Hard-link publication refuses to overwrite an existing file and makes the
    // complete, synced snapshot visible at once. Temp file stays on the same volume.
    let parent=path.parent().ok_or(AppError::Storage)?;
    let temporary=parent.join(format!(".meridian-backup-{}.tmp",uuid::Uuid::new_v4()));
    let result=(||->AppResult<()> {
        let mut file=OpenOptions::new().write(true).create_new(true).open(&temporary)?;
        file.write_all(json.as_bytes())?;file.sync_all()?;drop(file);
        fs::hard_link(&temporary,path).map_err(|e|if e.kind()==std::io::ErrorKind::AlreadyExists {
            invalid("That file already exists. Choose a new backup filename.")
        } else { e.into() })?;
        Ok(())
    })();
    let _=fs::remove_file(&temporary);result
}
pub fn restore(db:&mut Connection,json:&str,recovery_dir:&Path)->AppResult<RestoreResult> {
    let backup=validated(json)?; // No live database or recovery files touched until validation passes.
    let tx=db.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let prior=serde_json::to_vec_pretty(&snapshot(&tx)?)?;
    if prior.len()>MAX_BYTES { return Err(invalid("Current library exceeds the supported recovery-backup size.")); }
    fs::create_dir_all(recovery_dir)?;
    let stamp=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|_|AppError::Storage)?.as_millis();
    let path=recovery_dir.join(format!("before-restore-{stamp}-{}.json",uuid::Uuid::new_v4()));
    let mut file=OpenOptions::new().write(true).create_new(true).open(&path)?;
    if let Err(error)=file.write_all(&prior).and_then(|_|file.sync_all()) {
        drop(file); let _=fs::remove_file(&path); return Err(error.into());
    }
    drop(file);
    // Restore into the existing database, never swap/delete the file or its WAL.
    // Drop rolls back on insert, constraint, trigger, integrity or commit failure.
    apply(&tx,&backup)?;
    tx.commit()?;
    Ok(RestoreResult {summary:summary(&backup),recovery_path:path.display().to_string()})
}
