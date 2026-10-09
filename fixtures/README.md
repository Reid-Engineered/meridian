# Isolated catalog fixtures

Generate synthetic SQLite catalogs with 0, 10, 1,000 and 10,000 books:

```sh
cargo run --manifest-path src-tauri/core-tests/Cargo.toml --example fixtures -- fixtures/generated
```

Each run gets a new subdirectory; existing files are never overwritten. Generated files are ignored by Git and never target application-data storage. Do not replace your real library with these catalogs. Each size gets a JSON report with generation/list/search timings, integrity and reopen checks. These measurements cover the Rust repository in a debug build, not startup or UI rendering.

Data includes ordered authors, shared tags, a collection, mixed formats/statuses/ratings, Unicode titles and notes. Storage regression tests additionally cover ISBN, dates, Unicode author names, commas in names, failed writes and partial migration fixtures. Malformed backups, CSV and cover fixtures belong to Phase 1.
