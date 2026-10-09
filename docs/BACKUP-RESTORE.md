# Database backup and restore — October 8, 2026

**Historical database-only increment:** Settings now defaults to portable ZIP backups including managed images. Complete recovery ZIPs, cover imports and current evidence are documented in [COVERS-PORTABLE-BACKUP.md](COVERS-PORTABLE-BACKUP.md). The version-2 JSON catalog format below remains the archive catalog format and a compatibility API.

Desktop Settings now offers **Save backup** and **Choose file**. Choose file validates the document before showing its book, collection and reading-record counts. Cancel leaves the library unchanged. Replace library saves the previous catalog under the application-data `backups/` directory, then replaces the catalog in one transaction. Success shows the recovery filename; choose that file to recover the prior library. Recovery files are retained without automatic pruning.

Save backup uses a native save dialog, writes and synchronizes a temporary file beside the chosen destination, then publishes the complete file without overwriting an existing file. Choose a new name if a file already exists. Publication requires filesystem hard-link support (tested on NTFS); FAT/exFAT destinations are not qualified. Save locally and copy the completed JSON to another destination where necessary.

## What is preserved

The new `meridian-database` JSON format has backup version **2**, SQLite schema version **1**, and a fixed set of tables with column names and positional row values. It preserves all schema-1 catalog rows: works, ordered authors, editions/shared editions, owned copies, ownership state, tags, collections and memberships, every reading session, notes/reviews, timestamps and identifiers. Deleted-ID counters are preserved so new records do not reuse earlier identifiers. Schema migration metadata is managed by the installed application rather than imported from the backup.

Cover references are preserved exactly; cover image bytes are **not** embedded or copied. Keep the cover directory with the JSON. References to another machine's absolute paths may need repair. A portable cover archive remains the next ownership increment.

`export_library` remains a version-1 **catalog export** for existing consumers. It now takes one read transaction rather than separate locks. It contains current book details and latest reading state, so it cannot reproduce shared entities or full history. Legacy exports and browser-preview exports are rejected by database restore with an explanation. Browser preview labels this limitation and disables database restore.

## Safety boundary

- All backup reads use one SQLite snapshot, including committed WAL data. No raw `library.db` copy is made while WAL is active.
- Restore accepts at most 64 MiB of JSON. It checks format/schema versions, exact tables/columns, typed values, sequence counters and constraints in an isolated in-memory database, then checks foreign keys and integrity.
- Restore validates again on confirmation. A service mutex and immediate SQLite transaction protect the live snapshot and replacement from other writes. The recovery file is fully written and synchronized before the first catalog deletion; a failed recovery write aborts replacement.
- Table identifiers come from the fixed application list and column names from the trusted schema. Document values are SQL parameters; the document cannot supply executable SQL.
- Replacement deletes and reinserts catalog rows in dependency order, restores sequences and runs integrity checks. Errors roll back the transaction. The database file and WAL are never swapped or deleted.
- Recovery files contain the previous full catalog snapshot, including older sessions. A failure after recovery-file creation retains the recovery file. An interruption during the preliminary file write may leave an incomplete recovery file, but catalog replacement has not started at that point.

SQLite provides transaction recovery after process interruption. Abrupt process termination during restore, power loss and storage-controller durability were **not** separately fault-injected in this increment; do not treat transaction/error tests as those qualifications.

## Evidence

Six new Rust checks pass: lossless disk restore/reopen with shared editions, older sessions and deleted-ID counters; restoring the recovery copy; malformed/unsupported documents, invalid types, relationships and duplicate rows; recovery-write failure; injected insert failure after deletion with complete rollback and retained recovery; committed WAL reads and safe-save refusal to overwrite.

Four new frontend checks pass: inspect/summary/Cancel; invalid input and corrected-file retry; busy-state duplicate/Escape prevention, focus fallback and success refresh; recoverable restore failure without false success. Total suite: **12 frontend tests and 17 Rust tests**.

The separate installed test product passed **30 native WebView/IPC checks**, including six new backup/save/inspect/restore assertions, and was uninstalled. Full-record native snapshots compare equal before and after replacement. Raw evidence: `verification/native-smoke/eb4b5df7-b519-48bc-8dc3-338ce8895d89/report.json`; portable check summary: [backup-native-smoke.json](evidence/backup-native-smoke.json). Tests use isolated storage; the real library was not opened or changed.

Native file-picker/save-dialog interaction, screen-reader behavior for the new controls, and manual light/dark/compact visual review remain acceptance gaps. The native commands and React interaction states are verified independently. Standard verification builds normal MSI/NSIS installers without the smoke driver; `verification/latest.json` records the latest run.

Next: native cover import/ownership and a portable archive including images, followed by remaining installation/accessibility qualification. CSV and broad feature expansion remain planned.
