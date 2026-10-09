use meridian_core_tests::{database, domain::{BookInput, BookQuery}, repositories::LibraryRepository, services};
use rusqlite::Connection;
use std::{path::PathBuf, sync::atomic::{AtomicUsize, Ordering}};

static NEXT: AtomicUsize = AtomicUsize::new(0);
struct TestDirectory(PathBuf);
impl TestDirectory {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("meridian-storage-{}-{}-{}", std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos(), NEXT.fetch_add(1, Ordering::Relaxed)));
        std::fs::create_dir(&path).unwrap();
        Self(path)
    }
    fn db(&self) -> PathBuf { self.0.join("library.db") }
}
impl Drop for TestDirectory { fn drop(&mut self) { let _ = std::fs::remove_dir_all(&self.0); } }
fn input() -> BookInput {
    serde_json::from_value(serde_json::json!({
        "title":"Étoiles 星", "authors":["Doe, Jane", "李白"], "format":"Paperback",
        "status":"Reading", "currentPage":42, "pageCount":300, "rating":4,
        "tags":["science", "お気に入り"], "collectionIds":[], "notes":"Signed copy",
        "isbn13":"9781234567897", "dateStarted":"2026-01-01"
    })).unwrap()
}
fn version(conn: &Connection) -> i64 { conn.query_row("SELECT max(version) FROM schema_migrations", [], |r| r.get(0)).unwrap() }

#[test]
fn fresh_database_and_reopen_preserve_the_entire_book_graph() {
    let dir = TestDirectory::new();
    let mut conn = database::open(&dir.db()).unwrap();
    assert_eq!(version(&conn), 1);
    assert!(LibraryRepository::list(&conn, &BookQuery::default()).unwrap().is_empty());
    let c = LibraryRepository::create_collection(&conn, "Favorites", "Keepers").unwrap();
    let mut book = input(); book.collection_ids = vec![c.id];
    let created = LibraryRepository::create(&mut conn, &book).unwrap();
    let expected = serde_json::to_value(&created).unwrap();
    drop(conn);
    let conn = database::open(&dir.db()).unwrap();
    assert_eq!(version(&conn), 1);
    assert_eq!(serde_json::to_value(LibraryRepository::get(&conn, created.id).unwrap()).unwrap(), expected);
    assert_eq!(LibraryRepository::collections(&conn).unwrap()[0].book_count, 1);
    assert_eq!(conn.query_row("PRAGMA integrity_check", [], |r| r.get::<_, String>(0)).unwrap(), "ok");
    assert!(!conn.prepare("PRAGMA foreign_key_check").unwrap().exists([]).unwrap());
}

#[test]
fn partial_unversioned_schema_is_completed_without_losing_existing_rows() {
    let dir = TestDirectory::new();
    let conn = Connection::open(dir.db()).unwrap();
    // Simulate an interrupted pre-transaction migration after the first table.
    let initial = include_str!("../../migrations/001_initial.sql");
    let first = initial.split("CREATE TABLE IF NOT EXISTS authors").next().unwrap();
    conn.execute_batch(first).unwrap();
    conn.execute("INSERT INTO works(title) VALUES('Existing work')", []).unwrap();
    drop(conn);
    let conn = database::open(&dir.db()).unwrap();
    assert_eq!(version(&conn), 1);
    assert_eq!(conn.query_row("SELECT title FROM works", [], |r| r.get::<_, String>(0)).unwrap(), "Existing work");
    assert_eq!(LibraryRepository::collections(&conn).unwrap().len(), 0);
}

#[test]
fn failed_migration_rolls_back_new_schema_and_can_be_retried() {
    let dir = TestDirectory::new();
    let conn = Connection::open(dir.db()).unwrap();
    conn.execute_batch("CREATE TABLE works(id INTEGER PRIMARY KEY, title TEXT); INSERT INTO works VALUES(1,'Keep me'); CREATE TABLE editions(id INTEGER PRIMARY KEY);").unwrap();
    drop(conn);
    assert!(database::open(&dir.db()).is_err()); // Index creation cannot find work_id.
    let conn = Connection::open(dir.db()).unwrap();
    assert_eq!(conn.query_row("SELECT title FROM works", [], |r| r.get::<_, String>(0)).unwrap(), "Keep me");
    assert_eq!(conn.query_row("SELECT count(*) FROM sqlite_master WHERE name IN ('authors','schema_migrations')", [], |r| r.get::<_, i64>(0)).unwrap(), 0);
    conn.execute_batch("DROP TABLE editions;").unwrap();
    drop(conn);
    assert_eq!(version(&database::open(&dir.db()).unwrap()), 1);
}

#[test]
fn future_schema_is_rejected_without_altering_its_data() {
    let dir = TestDirectory::new();
    let conn = database::open(&dir.db()).unwrap();
    conn.execute("INSERT INTO schema_migrations(version) VALUES(2)", []).unwrap(); drop(conn);
    assert!(matches!(database::open(&dir.db()), Err(meridian_core_tests::error::AppError::UnsupportedSchema(2))));
    assert_eq!(version(&Connection::open(dir.db()).unwrap()), 2);
}

#[test]
fn invalid_create_and_update_roll_back_all_related_rows() {
    let mut conn = database::open(std::path::Path::new(":memory:")).unwrap();
    let created = LibraryRepository::create(&mut conn, &input()).unwrap();
    let before = serde_json::to_value(&created).unwrap();
    let mut invalid = input(); invalid.title = "Changed".into(); invalid.authors = vec!["New Author".into()]; invalid.rating = Some(6);
    assert!(LibraryRepository::update(&mut conn, created.id, &invalid).is_err());
    assert_eq!(serde_json::to_value(LibraryRepository::get(&conn, created.id).unwrap()).unwrap(), before);
    invalid.isbn13 = None;
    assert!(LibraryRepository::create(&mut conn, &invalid).is_err());
    for table in ["works", "editions", "library_copies", "reading_records"] {
        assert_eq!(conn.query_row(&format!("SELECT count(*) FROM {table}"), [], |r| r.get::<_, i64>(0)).unwrap(), 1);
    }
    assert_eq!(conn.query_row("SELECT count(*) FROM authors WHERE name='New Author'", [], |r| r.get::<_, i64>(0)).unwrap(), 0);
    invalid.rating = Some(4); invalid.collection_ids = vec![999];
    assert!(LibraryRepository::create(&mut conn, &invalid).is_err());
    assert_eq!(LibraryRepository::list(&conn, &BookQuery::default()).unwrap().len(), 1);
}

#[test]
fn development_seed_is_ten_books_and_repeat_launch_is_idempotent() {
    let mut conn = database::open(std::path::Path::new(":memory:")).unwrap();
    services::seed_development(&mut conn).unwrap();
    services::seed_development(&mut conn).unwrap();
    assert_eq!(LibraryRepository::list(&conn, &BookQuery::default()).unwrap().len(), 10);
    assert_eq!(LibraryRepository::collections(&conn).unwrap().len(), 3);
}

#[test]
fn development_seed_reuses_existing_collections_after_catalog_is_cleared() {
    let mut conn = database::open(std::path::Path::new(":memory:")).unwrap();
    LibraryRepository::create_collection(&conn, "User collection", "Preserve me").unwrap();
    let favorites = LibraryRepository::create_collection(&conn, "favorites", "User description").unwrap();
    services::seed_development(&mut conn).unwrap();
    let dune = LibraryRepository::list(&conn, &BookQuery {search:Some("Dune".into()), ..Default::default()}).unwrap();
    assert!(dune[0].collection_ids.contains(&favorites.id));
    conn.execute("DELETE FROM library_copies", []).unwrap();
    services::seed_development(&mut conn).unwrap();
    assert_eq!(LibraryRepository::list(&conn, &BookQuery::default()).unwrap().len(), 10);
    let collections = LibraryRepository::collections(&conn).unwrap();
    assert_eq!(collections.len(), 4);
    assert_eq!(collections.iter().find(|c|c.id==favorites.id).unwrap().description.as_deref(), Some("User description"));
}

#[test]
fn failed_development_seed_rolls_back_books_and_collections() {
    let mut conn = database::open(std::path::Path::new(":memory:")).unwrap();
    conn.execute_batch("CREATE TRIGGER reject_seed BEFORE INSERT ON works WHEN NEW.title='1984' BEGIN SELECT RAISE(ABORT, 'simulated seed failure'); END;").unwrap();
    assert!(services::seed_development(&mut conn).is_err());
    assert!(LibraryRepository::list(&conn, &BookQuery::default()).unwrap().is_empty());
    assert!(LibraryRepository::collections(&conn).unwrap().is_empty());
    assert_eq!(conn.query_row("SELECT count(*) FROM works", [], |r|r.get::<_, i64>(0)).unwrap(), 0);
    conn.execute_batch("DROP TRIGGER reject_seed;").unwrap();
    services::seed_development(&mut conn).unwrap();
    assert_eq!(LibraryRepository::list(&conn, &BookQuery::default()).unwrap().len(), 10);
}
