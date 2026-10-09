# Phase 0 baseline — October 8, 2026

Phase 0 has passing automated, isolated installed-app and live keyboard evidence. Formal clean-profile, upgrade and screen-reader qualification remain open; see docs/PHASE0-SMOKE.md. No real application-data library was opened or changed for these checks.

## Changes in this increment

- `npm run verify` runs frontend tests/build, Rust core tests, fixture generation and the Tauri release build; `--quick` skips desktop packaging. It reports all selected checks, writes `verification/latest.json`, and exits nonzero if any fail.
- Schema DDL and its version record commit atomically under an immediate transaction. Unsupported newer schema versions produce an actionable error.
- Core tests use production storage initialization rather than applying raw SQL outside the migration path.
- Storage regressions cover disk reopen with complete book details, compatible partial migrations, rollback/retry after incompatible partial migration, future schema rejection, invalid create/update rollback and repeat development seeding.
- Development seeding now commits atomically and reuses existing named collections/IDs. Regression tests cover clearing all copies and injected startup failure with a successful retry.
- The bundle configuration now references the existing desktop icons, fixing Windows packaging's missing configured icon.
- Synthetic catalogs at 0, 10, 1,000 and 10,000 books are generated into isolated per-run directories with integrity, foreign-key, list/search and reopen checks.
- Architecture, IPC contracts, project instructions, acceptance cases and preliminary design findings are documented.

## Automated evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Frontend tests | PASS: 8 tests | 3 service tests and 5 dialog/shortcut regressions |
| TypeScript and Vite production build | PASS | 1,594 modules; JS 208.08 kB / 62.70 kB gzip |
| Rust repository/storage tests | PASS: 11 tests | 3 original repository tests + 8 storage/startup regressions |
| Catalog fixtures | PASS: all four sizes | integrity_check=ok, no foreign-key violations, exact reopen counts |
| Tauri release build/bundles | PASS | GNU release executable, x64 MSI and NSIS installers; no signing or clean-install qualification |
| Diff whitespace check | PASS | `git diff --check` |

Initial sandbox runs failed with Node EPERM on realpath and missing MSVC `link.exe`. Frontend checks passed when run outside the sandbox. Rust checks passed with the already installed GNU Rust/MSYS2 toolchain. No global toolchain settings were changed. On this machine, use this temporary PowerShell environment for the fallback:

```powershell
$env:PATH = 'C:\msys64\ucrt64\bin;' + $env:PATH
$env:RUSTUP_TOOLCHAIN = 'stable-x86_64-pc-windows-gnu'
npm run verify
```

Other machines should use their configured toolchain and appropriate installed linker. The GNU core test result does not prove MSVC packaging compatibility.

The initial release executable compiled but bundling failed because the bundle icon list was empty. Referencing the existing checked-in icons resolved that failure. Final bundles are `src-tauri/target/release/bundle/msi/Meridian_0.1.0_x64_en-US.msi` and `src-tauri/target/release/bundle/nsis/Meridian_0.1.0_x64-setup.exe`. A successful bundle build does not qualify installation or upgrade behavior.

## Repository measurements

These are one-run debug-build measurements on this machine, including conversion of every returned book graph. They are observations, not performance guarantees or UI benchmarks.

| Books | Generate seconds | Full list seconds | Targeted search seconds |
| --- | --- | --- | --- |
| 0 | 0.013 | 0.00019 | 0.00018 |
| 10 | 0.027 | 0.00142 | 0.00045 |
| 1,000 | 1.499 | 0.148 | 0.00774 |
| 10,000 | 21.929 | 1.660 | 0.07405 |

Raw reports are in `fixtures/generated/run-1791510937299348100/`. Full listing performs per-book relation queries; the 10,000-book result suggests pagination/query optimization should precede any claim of responsive large-library UI behavior.

## Acceptance matrix

PASS below means the named automated layer passed; it does not imply the native UI flow passed. NOT RUN is an evidence gap, not success.

| Case | Layer/result | Acceptance steps |
| --- | --- | --- |
| Fresh empty library | Rust and installed native IPC PASS | Start release against isolated fresh app data; verify empty state and no sample data |
| Development seed | Rust PASS; native NOT RUN | First debug launch has 10 books; relaunch does not add duplicates |
| Disk persistence | Rust and installed native IPC PASS; preview reload PASS | Create book with two ordered Unicode authors, tags, collection, ISBN, notes and reading progress; relaunch and compare all fields |
| CRUD, search and collections | Rust/frontend and installed native IPC PASS; preview flow PASS | Create/edit/delete; search title/author/tag; assign two collections and delete one while preserving the other |
| Failed writes preserve data | Rust PASS | Invalid rating and nonexistent collection fail; no partial create or update graph persists |
| Partial/failing migrations | Rust PASS | Compatible partial schema completes; failed schema work rolls back, preserves prior rows and can be retried |
| Future schema | Rust PASS | Open version 2 with this version; expect recoverable refusal and unchanged version |
| Clean installation and native startup | Separate test product install/start/uninstall PASS on existing profile; clean profile NOT RUN | Install on clean Windows profile; verify executable, first launch, app-data paths and restart |
| Upgrade/downgrade behavior | NOT RUN | Upgrade an isolated version-1 library; verify data. Reopen unsupported version with compatible app; never silently downgrade |
| Offline manual entry | NOT RUN | Disable network for an isolated test session; CRUD/search/collections/export continue; optional lookup fails recoverably |
| Export/restore round trip | Version-2 full-catalog Rust disk/reopen and installed native IPC PASS; covers excluded | Export complete catalog, restore to isolated storage, compare all entities and covers; Phase 1 |
| Reading history | PARTIAL | Latest record editable; reread/history operations are planned |
| Native cover ownership | UNIMPLEMENTED | Select/copy cover and reopen offline; verify backup portability; Phase 1 |
| Keyboard, screen reader, 200% scaling | Browser keyboard PASS; native 200% WebView zoom PASS; NVDA NOT RUN | Execute checks in UI-AUDIT.md on both themes |
| Reference screenshot parity | NOT RUN | Capture each current screen and compare to supplied references |

## Known risks and next priorities

1. Isolated installed native startup/relaunch, 24 IPC checks and browser keyboard flows now pass. Clean-profile, upgrade and screen-reader qualification still need evidence.
2. Dialog focus, keyboard tabs, native book buttons and visible compact Add book are corrected and tested. Updated muted/faint token pairs pass 4.5:1; exhaustive usage contrast and NVDA checks remain open.
3. Version-2 full-catalog backup/restore is implemented and verified, including history and automatic recovery copies; see BACKUP-RESTORE.md. Portable cover binaries and process/power-loss qualification remain open.
4. Current metadata confirmation can overwrite manually entered values; author comma parsing changes names containing commas. Address in entry-quality work.
5. Debug seed initialization now preserves existing collection IDs/descriptions and rolls back on error. It still repopulates an empty debug catalog intentionally. Release builds omit the seed call, but first-launch release behavior still needs execution evidence.
6. Recorded schema versions are trusted; comprehensive malformed-current-schema checks and recovery remain future work. CLI/agent adapters, undo, CI and installer qualification are still planned.

Phase 0 exit criteria remain open until the missing native and visual evidence is recorded. Do not start broad feature expansion based solely on these unit tests.

October 8 backup follow-up: current suites pass 12 frontend and 17 Rust tests; installed smoke has 30 assertions. Normal MSI/NSIS are rebuilt through full verification. This follows the historical Phase 0 figures above; docs/BACKUP-RESTORE.md records the scope and remaining gaps.

October 8 Windows launch fix: the release entry point now selects the Windows GUI subsystem. The desktop-build wrapper checks the built PE header for subsystem 2 (GUI) and fails if a console build slips through. This changes executable launch presentation and leaves the application-data path and library untouched.
