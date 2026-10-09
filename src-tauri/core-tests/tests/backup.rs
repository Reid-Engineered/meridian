use meridian_core_tests::{backup, database, services};
use rusqlite::Connection;
use serde_json::{json,Value};
use std::path::PathBuf;
struct Directory(PathBuf);
impl Directory { fn new()->Self { let path=std::env::temp_dir().join(format!("meridian-backup-test-{}",uuid::Uuid::new_v4()));std::fs::create_dir(&path).unwrap();Self(path) } }
impl Drop for Directory { fn drop(&mut self){let _=std::fs::remove_dir_all(&self.0);} }
fn populated()->Connection {
    let mut db=database::open(std::path::Path::new(":memory:")).unwrap();services::seed_development(&mut db).unwrap();
    // Shared edition, a second reading session, unused author, historical timestamps,
    // ownership state and a deleted high ID aren't represented by legacy BookDetail.
    db.execute_batch("INSERT INTO library_copies(id,edition_id,ownership_status,date_added,notes) VALUES(71,1,'Loaned','1999-12-31','星');
      INSERT INTO reading_records(copy_id,status,date_finished,rating) VALUES(71,'Finished','2000-01-01',5);
      INSERT INTO reading_records(copy_id,status,current_page) VALUES(1,'Reading',99);
      INSERT INTO authors(name) VALUES('Unused, Élodie');
      INSERT INTO library_copies(id,edition_id) VALUES(900,1);DELETE FROM library_copies WHERE id=900;").unwrap();db
}
fn value(db:&mut Connection)->Value { serde_json::from_str(&backup::export(db).unwrap()).unwrap() }
#[test] fn lossless_disk_round_trip_preserves_history_shared_entities_and_sequences() {
    let dir=Directory::new();let mut original=populated();let expected=value(&mut original);
    let json=serde_json::to_string(&expected).unwrap();
    let mut target=database::open(&dir.0.join("restored.db")).unwrap();
    let result=backup::restore(&mut target,&json,&dir.0.join("backups")).unwrap();
    assert_eq!(result.summary.books,11);assert_eq!(result.summary.reading_records,12);
    assert_eq!(value(&mut target),expected);drop(target);
    let mut reopened=database::open(&dir.0.join("restored.db")).unwrap();assert_eq!(value(&mut reopened),expected);
    reopened.execute("INSERT INTO library_copies(edition_id) VALUES(1)",[]).unwrap();assert!(reopened.last_insert_rowid()>900);
}
#[test] fn recovery_copy_restores_the_entire_previous_library() {
    let dir=Directory::new();let mut live=populated();let before=value(&mut live);
    let empty=backup::export(&mut database::open(std::path::Path::new(":memory:")).unwrap()).unwrap();
    let result=backup::restore(&mut live,&empty,&dir.0).unwrap();assert_eq!(result.summary.books,0);
    let saved=std::fs::read_to_string(result.recovery_path).unwrap();assert_eq!(serde_json::from_str::<Value>(&saved).unwrap(),before);
    backup::restore(&mut live,&saved,&dir.0).unwrap();assert_eq!(value(&mut live),before);
}
#[test] fn malformed_versions_types_constraints_and_relationships_leave_live_data_unchanged() {
    let dir=Directory::new();let mut live=populated();let before=value(&mut live);
    let mut cases=vec![json!({"version":1,"books":[],"collections":[]})];
    let mut future=before.clone();future["schemaVersion"]=json!(2);cases.push(future);
    let mut missing=before.clone();missing["tables"].as_object_mut().unwrap().remove("authors");cases.push(missing);
    let mut wrong=before.clone();wrong["tables"]["works"]["columns"][0]=json!("id);DROP TABLE works;");cases.push(wrong);
    let mut orphan=before.clone();orphan["tables"]["library_copies"]["rows"][0][1]=json!(99999);cases.push(orphan);
    let mut blank=before.clone();blank["tables"]["works"]["rows"][0][1]=json!(" ");cases.push(blank);
    let mut ty=before.clone();ty["tables"]["works"]["rows"][0][0]=json!("1");cases.push(ty);
    let mut duplicate=before.clone();let row=duplicate["tables"]["editions"]["rows"][0].clone();duplicate["tables"]["editions"]["rows"].as_array_mut().unwrap().push(row);cases.push(duplicate);
    for case in cases { assert!(backup::restore(&mut live,&case.to_string(),&dir.0.join("recovery")).is_err());assert_eq!(value(&mut live),before); }
    assert!(backup::inspect("{broken").is_err());assert!(!dir.0.join("recovery").exists());
}
#[test] fn safety_write_failure_prevents_any_replacement() {
    let dir=Directory::new();let path=dir.0.join("not-a-directory");std::fs::write(&path,"obstruction").unwrap();
    let mut live=populated();let before=value(&mut live);let empty=backup::export(&mut database::open(std::path::Path::new(":memory:")).unwrap()).unwrap();
    assert!(backup::restore(&mut live,&empty,&path).is_err());assert_eq!(value(&mut live),before);
}
#[test] fn insertion_failure_after_deletion_rolls_back_and_retains_safety_copy() {
    let dir=Directory::new();let mut live=populated();let before=value(&mut live);
    live.execute_batch("CREATE TRIGGER reject_restore BEFORE INSERT ON works BEGIN SELECT RAISE(ABORT,'injected failure'); END;").unwrap();
    assert!(backup::restore(&mut live,&before.to_string(),&dir.0).is_err());assert_eq!(value(&mut live),before);
    let paths=std::fs::read_dir(&dir.0).unwrap().collect::<Result<Vec<_>,_>>().unwrap();assert_eq!(paths.len(),1);
    assert_eq!(serde_json::from_str::<Value>(&std::fs::read_to_string(paths[0].path()).unwrap()).unwrap(),before);
}
#[test] fn wal_snapshot_includes_committed_data_and_safe_save_never_overwrites() {
    let dir=Directory::new();let mut db=database::open(&dir.0.join("live.db")).unwrap();
    let writer=database::open(&dir.0.join("live.db")).unwrap();writer.execute("INSERT INTO works(title) VALUES('WAL committed')",[]).unwrap();
    let saved=backup::export(&mut db).unwrap();assert_eq!(backup::inspect(&saved).unwrap().books,0);
    assert!(saved.contains("WAL committed"));let path=dir.0.join("backup.json");backup::save(&saved,&path).unwrap();
    assert!(backup::save("replacement",&path).is_err());assert_eq!(std::fs::read_to_string(&path).unwrap(),saved);
    assert!(!std::fs::read_dir(&dir.0).unwrap().any(|p|p.unwrap().file_name().to_string_lossy().ends_with(".tmp")));
}
