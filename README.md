# Meridian

Meridian is a private, local-first desktop application for cataloguing a personal book library. It uses Tauri 2, React, TypeScript, Rust, and SQLite. The warm, book-forward interface is based on the supplied LibMAN design references in `reference-ui/screens`.

## Architecture

- `src/` contains the React presentation layer, typed frontend models, pages, reusable components, and a single service boundary around Tauri `invoke()` calls.
- `src-tauri/src/commands/` contains thin IPC handlers.
- `src-tauri/src/services/` coordinates use cases and application state.
- `src-tauri/src/repositories/` owns all SQL and transactional persistence.
- `src-tauri/src/domain/` contains strongly typed IPC/domain models.
- `src-tauri/src/metadata/` isolates the optional Open Library ISBN adapter from the internal model.
- `src-tauri/migrations/` contains versioned SQLite schema changes.

The browser development preview uses local storage and sample data. The Tauri application uses SQLite in the platform application-data directory. Debug builds seed ten sample titles only when the database is empty; release builds begin with an empty library.

## Database model

The schema distinguishes literary works, publication editions, and owned library copies. Authors use a `work_authors` join table; tags and collections use their own many-to-many join tables. Reading records are separate from copies so the model can support multiple reading sessions later. Foreign keys, constraints, indexes, and transactions protect relational integrity.

## Development

Prerequisites: Node.js 20+, Rust stable, and the [Tauri 2 system prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform.

```bash
npm install
npm run tauri dev
```

Frontend-only preview:

```bash
npm run dev
```

## Tests and builds

```bash
npm test
cargo test --manifest-path src-tauri/core-tests/Cargo.toml
npm run build
npm run tauri build
```

## Current limitations

- ISBN lookup uses Open Library and requires internet access; manual entry always remains available.
- Export produces a portable JSON backup. Import UI is intentionally disabled until validated transactional restore is implemented.
- Cover URLs and packaged sample covers display today; the backend directory is prepared for a future native file-copy command.
- Collection creation, renaming, deletion, and many-to-many book assignment are supported.
- Reading records are modeled for history, while the interface currently edits the latest session.
