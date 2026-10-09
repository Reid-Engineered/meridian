# Native command contract

All payload keys and model fields on the wire use camelCase. UI calls `libraryService`, which calls Tauri `invoke(command, payload)` in the desktop app. Returned Rust errors serialize as rejected strings, not structured error objects. Callers must handle strings as well as JavaScript `Error` instances. No general production CLI or external agent adapter exists yet. A feature-gated native IPC smoke adapter exists for verification; see PHASE0-SMOKE.md.

| Command | Payload | Result | Failure behavior |
| --- | --- | --- | --- |
| `list_books` | `{query: BookQuery}` | `BookDetail[]` | Database error |
| `get_book` | `{id: number}` | `BookDetail` | Missing book or database error |
| `create_book` | `{input: BookInput}` | `BookDetail` | Missing title, constraint or database error; graph rollback |
| `update_book` | `{id, input: BookInput}` | `BookDetail` | Missing book/title or invalid data; previous graph preserved |
| `delete_book` | `{id}` | `null` / frontend `void` | Missing book or database error; no undo |
| `list_collections` | none | `Collection[]` | Database error |
| `create_collection` | `{name, description}` | `Collection` | Empty/duplicate name or database error |
| `rename_collection` | `{id, name, description}` | `Collection` | Missing ID, empty/duplicate name or database error |
| `delete_collection` | `{id}` | `null` / frontend `void` | Missing ID or database error; books remain |
| `get_statistics` | none | `Statistics` | Database error |
| `lookup_isbn` | `{isbn: string}` | `MetadataResult` | Invalid ISBN or optional network/provider failure |
| `get_app_info` | none | `AppInfo` | Reports paths and version; no data mutation |
| `export_library` | none | JSON **string** | Database/serialization error; returns data, does not save a file |
| `create_backup` | none | Version-2 database backup JSON **string** | Consistent snapshot; database/serialization/64 MiB limit error |
| `save_backup` | `{path: string}` | `null` | Saves a full database snapshot; refuses existing destination, failed writes leave destination absent |
| `inspect_backup` | `{json: string}` | `{books, collections, readingRecords}` | Isolated validation; no live data or filesystem mutation |
| `restore_backup` | `{json: string}` | `{summary: {books, collections, readingRecords}, recoveryPath: string}` | Replace semantics; validates, synchronizes recovery copy, commits atomically; errors preserve previous catalog |

```ts
const book = await libraryService.createBook({
  title: "Example", authors: ["Jane Doe"], format: "Paperback",
  status: "Unread", tags: [], collectionIds: []
});
const matches = await libraryService.listBooks({ search: "Jane", sort: "title_asc" });
```

## Models

`BookInput` requires title, authors, format, status, tags and collectionIds. Optional fields: subtitle, description, publicationYear, series, seriesPosition, isbn10, isbn13, publisher, pageCount, language, currentPage, rating, coverUrl, location, condition, notes, review, dateAcquired, dateStarted and dateFinished. Omitted optional Rust fields become `None`; returned optional fields serialize as null. Input arrays must be present. `BookDetail` adds copy ID and dateAdded.

`BookQuery` supports search across title/subtitle/author/ISBN/series/tag, status, format, minRating, collectionId and sort. Sort values are `<field>_<asc|desc>` for `title`, `author`, `publication_year`, `rating` and `date_added` (for example `title_desc`, `rating_asc`); any other value uses `date_added_desc`. Books missing a year, rating or author sort last in either direction; ties fall back to title. The browser preview follows the same rules. No pagination exists. Search uses SQLite LIKE, so `%` and `_` are wildcards rather than literal search characters. Empty search is ignored; `All` ignores status/format filters.

Status: Want to Read, Unread, Reading, Finished, Did Not Finish. Format: Hardcover, Paperback, Mass Market Paperback, Ebook, Audiobook, Other. Native constraints enforce nonempty titles/names, rating 1–5, nonnegative pages, publication year 0–3000 and unique ISBNs. Current page is not yet checked against page count; ISBN checksum validation is planned.

`Collection` includes id, name, nullable description, bookCount and covers (native currently returns an empty covers array). `Statistics` includes counts, pagesRead, nullable averageRating, topAuthors, statusCounts, formatCounts and monthly activity. `AppInfo` contains databasePath, coversPath and version. `MetadataResult` contains title/authors and optional edition/description/cover fields.

Catalog export shape: `{version: 1, books: BookDetail[], collections: Collection[]}`. It uses one service lock and read transaction, but contains current book details and latest reading state rather than all historical sessions/shared entities. Cover files are not embedded; this format is not accepted by restore.

Database backup shape: `{format: "meridian-database", version: 2, schemaVersion: 1, tables: {[table]: {columns: string[], rows: (string | number | null)[][]}}}`. Fixed tables: works, authors, work_authors, editions, library_copies, reading_records, tags, copy_tags, collections, collection_copies, sqlite_sequence. Column order must match the schema; constraints, types, sequence counters, FK and integrity checks run before replacement. Limit: 64 MiB of UTF-8 JSON. Restoring replaces the entire catalog and retains its previous snapshot under app-data/backups. Cover references survive; image files are separate. See BACKUP-RESTORE.md for verification and filesystem limits.

## Managed covers and portable archives

Cover references use meridian-cover:<SHA-256>.jpg. Heavy import/archive operations run on native worker threads; LibraryService serializes database access. Existing JSON restore now validates locally available managed images and makes a complete recovery ZIP. Settings defaults to the portable file commands below.

| Command | Payload | Result | Failure behavior |
| --- | --- | --- | --- |
| import_cover | {path} | {reference, bytes, width, height} | PNG/JPEG/WebP, 20 MiB/24MP limits, resized JPEG; invalid imports leave no file |
| read_cover | {reference} | JPEG data URL string | Only validated managed references, dimensions and digest-matching files |
| get_cover_storage | none | {files, bytes} | Physical managed file count/bytes; includes unused retained images |
| save_portable_backup | {path} | null | Consistent catalog plus referenced managed JPEGs; synced, no overwrite |
| inspect_backup_file | {path} | {digest, summary, coverFiles, coverBytes, externalCovers} | Staged ZIP or version-2 JSON without managed images; no live mutation |
| restore_backup_file | {path, digest} | {summary, recoveryPath} | Review digest must match; complete recovery ZIP before replacement; catalog rollback on failure |

Portable ZIP contains catalog.json and covers/<SHA-256>.jpg only. Limit: 2 GiB file/unpacked total, 100,001 entries, 64 MiB catalog, 512 KiB per managed JPEG. Remote/other cover references remain links; inspect reports their count. Old assets are never overwritten or removed. See COVERS-PORTABLE-BACKUP.md for the exact safety and qualification boundary.
