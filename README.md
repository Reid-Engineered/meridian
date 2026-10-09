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

Run the standard checks with one command:

```bash
npm run verify
# Frontend, Rust core and generated fixtures without desktop packaging:
npm run verify -- --quick
```

The script runs every selected check, reports failures, and writes `verification/latest.json`. Synthetic catalogs go into a new run directory under `fixtures/generated`; no user library is touched. Node and Cargo must be on PATH. The default Rust toolchain needs its platform linker; see [baseline evidence](docs/BASELINE.md) for this machine's GNU fallback and packaging limitations.

See [architecture](docs/ARCHITECTURE.md), [command contracts](docs/COMMANDS.md), [acceptance evidence](docs/BASELINE.md), [UI audit](docs/UI-AUDIT.md), and [fixture instructions](fixtures/README.md).

```bash
npm test
cargo test --manifest-path src-tauri/core-tests/Cargo.toml
npm run build
npm run build:desktop
```

`build:desktop` inspects the configured Rust host. Windows GNU builds include the dependency-generated `WebView2Loader.dll` beside the installed executable; other platforms/toolchains retain their normal bundle settings. Raw `tauri build` does not apply this GNU safeguard. Windows release executables use the GUI subsystem so launching Meridian does not open a console; the wrapper verifies the built executable header. Development builds retain console diagnostics.

For the isolated Windows installer and native IPC smoke check:

```bash
npm run build:desktop -- --smoke
npm run smoke:native
```

This builds a separately identified **Meridian Smoke Test** app, installs it into a new verification directory, checks four process launches including 200% zoom, then uninstalls it. Its Rust driver exists only with the `smoke-test` feature and requires an explicit marked data directory. Normal installers exclude it. See [smoke evidence](docs/PHASE0-SMOKE.md).

## Current limitations

- ISBN lookup uses Open Library and requires internet access; manual entry always remains available.
- Desktop Settings saves version-2 database backups and validates/confirms transactional restore, with an automatic recovery copy. All catalog records and reading history are preserved; cover image files remain separate. Legacy version-1 catalog exports and browser-preview exports cannot be restored. See [backup/restore evidence and limits](docs/BACKUP-RESTORE.md).
- Cover URLs and packaged sample covers display today; the backend directory is prepared for a future native file-copy command.
- Collection creation, renaming, deletion, and many-to-many book assignment are supported.
- Reading records are modeled for history, while the interface currently edits the latest session.
