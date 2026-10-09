use meridian_core_tests::{database, domain::{BookInput, BookQuery}, repositories::LibraryRepository};
use std::{error::Error, path::PathBuf, time::Instant};

fn main() -> Result<(), Box<dyn Error>> {
    let base = PathBuf::from(std::env::args().nth(1).ok_or("Provide an isolated output directory")?);
    let run = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH)?.as_nanos();
    let output = base.join(format!("run-{run}"));
    std::fs::create_dir_all(&output)?;
    println!("Isolated fixtures: {}", output.display());
    for size in [0, 10, 1_000, 10_000] {
        let path = output.join(format!("library-{size}.db"));
        // Never overwrite an existing catalog, even in the fixture directory.
        if path.exists() { return Err(format!("{} already exists; choose a new fixture directory", path.display()).into()); }
        let start = Instant::now();
        let mut conn = database::open(&path)?;
        let collection = LibraryRepository::create_collection(&conn, "Fixture collection", "Synthetic data only")?;
        for index in 0..size {
            let book: BookInput = serde_json::from_value(serde_json::json!({
                "title":format!("Fixture book {index:05} — 星"), "authors":[format!("Author {}", index % 100), "Doe, Jane"],
                "format": if index % 2 == 0 {"Paperback"} else {"Hardcover"},
                "status":if index % 3 == 0 {"Finished"} else {"Unread"},
                "pageCount":300, "rating":(index % 5) + 1, "tags":["fixture", format!("group-{}", index % 10)],
                "collectionIds":[collection.id], "notes":"Synthetic fixture; never a real library",
                "dateFinished":if index % 3 == 0 {Some("2026-02-12")} else {None}
            }))?;
            LibraryRepository::create(&mut conn, &book)?;
        }
        let count: i64 = conn.query_row("SELECT count(*) FROM library_copies", [], |row| row.get(0))?;
        assert_eq!(count, size);
        let generated_seconds = start.elapsed().as_secs_f64();
        let start = Instant::now();
        assert_eq!(LibraryRepository::list(&conn, &BookQuery::default())?.len(), size as usize);
        let list_seconds = start.elapsed().as_secs_f64();
        let start = Instant::now();
        let search_results = LibraryRepository::list(&conn, &BookQuery { search:Some("00009".into()), ..Default::default() })?.len();
        assert_eq!(search_results, if size >= 10 {1} else {0});
        let search_seconds = start.elapsed().as_secs_f64();
        assert_eq!(conn.query_row("PRAGMA integrity_check", [], |r| r.get::<_, String>(0))?, "ok");
        assert!(!conn.prepare("PRAGMA foreign_key_check")?.exists([])?);
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
        drop(conn);
        let reopened = database::open(&path)?;
        assert_eq!(reopened.query_row("SELECT count(*) FROM library_copies", [], |r| r.get::<_, i64>(0))?, size);
        let report = serde_json::json!({"books":size,"generatedSeconds":generated_seconds,"listSeconds":list_seconds,"searchSeconds":search_seconds,"integrity":"ok","reopenCount":size});
        std::fs::write(output.join(format!("library-{size}.json")), serde_json::to_string_pretty(&report)?)?;
        println!("{report}");
    }
    Ok(())
}
