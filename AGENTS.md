# Meridian working instructions

Build the engine first. Keep React presentation separate from domain behavior, use cases, and persistence. UI operations cross `src/services/library.ts` into thin Tauri commands; SQL belongs in repositories.

Expose operations through documented commands with predictable results and recoverable errors. CLI and agent adapters should reuse the same services when introduced.

Protect the user's library: transactional writes, atomic migrations, safe saving, recovery, and eventually undo take priority over feature breadth. Tests and generated catalogs must never use the platform application-data database.

Work in small, coherent increments. Completion requires appropriate behavior checks and current documentation. Verify resulting data, failures, round trips, and performance; a visible control is not proof.

Read `docs/ARCHITECTURE.md`, `docs/BASELINE.md`, and `ROADMAP.md` before changing boundaries or priorities. Current priority is closing Phase 0 evidence gaps, then safe backup restoration in Phase 1.

Run `npm run verify -- --quick` for frontend/core changes and full `npm run verify` for desktop packaging changes. Report environmental failures and manual checks honestly. Avoid unrelated formatting or changes to existing user work.

Use clear ownership and stable contracts for any authorized parallel work. Respect public specifications, licenses, attribution, and ownership when learning from other tools. Share reusable development lessons without coupling Meridian to other projects.
