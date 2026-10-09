# Meridian Development Roadmap

This roadmap assigns implementation work across **Codex**, **Claude**, and **Agy**. Complete phases in order unless a task is explicitly marked as parallel. Database and IPC contracts should be agreed before frontend work that depends on them begins.

## Responsibilities

| Agent | Primary responsibility |
| --- | --- |
| **Codex** | Rust, SQLite, Tauri commands, filesystem integration, builds, automated tests |
| **Agy** | React UX, visual design, interaction design, accessibility, frontend tests, release screenshots |
| **Claude** | Independent design and implementation review, product acceptance, edge-case analysis, documentation, release QA |

## Working agreement

- One agent owns each task and its files until the task is merged.
- Codex defines TypeScript/Rust IPC contracts before Agy connects new UI.
- Schema changes always include a migration and rollback/recovery notes.
- Claude reviews Agy's designs and the integrated implementation independently, then records failures as reproducible issues.
- Agy owns visual decisions and UI implementation; Claude recommends changes but does not become the design owner.
- No phase is complete until its automated tests and manual acceptance checks pass.
- Preserve Meridian's local-first model: no account system, remote backend, telemetry, or required internet connection.

---

## Phase 0 — Baseline and safeguards

**Goal:** Establish a stable starting point before expanding the application.

### Codex

- [x] Run and record the frontend build, frontend tests, Rust core tests, and Tauri release build.
- [x] Add a single cross-platform verification script for the standard checks.
- [x] Document the current IPC commands and shared TypeScript/Rust models.
- [x] Add migration-version tests for new, current, and partially migrated databases.
- [x] Create representative test databases containing 0, 10, 1,000, and 10,000 books.

### Agy

- [ ] Audit the current UI against the supplied reference screenshots.
- [x] Document layout, color, typography, spacing, and interaction tokens.
- [x] Review keyboard navigation, visible focus, dialog focus trapping, and 200% WebView zoom (OS text-only scaling and screen-reader qualification remain open).
- [x] Produce a prioritized UX issue list without redesigning working flows unnecessarily.

### Claude

- [x] Convert the MVP requirements into a pass/fail acceptance matrix.
- [ ] Verify clean install, first launch, empty library, seeded development mode, and relaunch persistence.
- [x] Define reusable book, author, ISBN, tag, collection, and latest-reading-state fixtures (full history is planned).
- [x] Record known limitations and confirm they match `README.md`.

### Exit criteria

- [x] All standard automated checks pass (GNU toolchain on this Windows host).
- [ ] The acceptance matrix and design audit are committed.
- [x] Database fixtures are isolated from the user's real library.

**October 8 baseline:** all standard automated checks and MSI/NSIS builds passed; evidence and preliminary source audit are in `docs/BASELINE.md` and `docs/UI-AUDIT.md`. Named roles above are responsibility categories; this baseline increment was performed in this chat. Native installation, live visual comparison and keyboard/scaling checks remain open.

**October 8 follow-up:** separate-product installed native smoke check passed 24 WebView/IPC assertions and uninstall; live browser keyboard/create/edit/reload/collection flows passed. Missing GNU WebView2 loader packaging, modal focus, tab navigation and compact Add book were fixed. Eight frontend tests and eleven Rust tests pass. `docs/PHASE0-SMOKE.md` records the exact scope; clean-profile, upgrade, NVDA and exhaustive visual qualification remain open.

---

## Phase 1 — Local data ownership

**Goal:** Make Meridian safe for a user to trust with a large personal catalog.

### Codex

- [ ] Implement a native cover-file picker and copy selected images into the application-data cover directory.
- [ ] Validate cover type and size, generate collision-safe filenames, and clean up failed imports.
- [ ] Store portable cover references rather than machine-specific absolute paths where possible.
- [x] Implement transactional JSON database backup restoration with schema-version validation (version 2; legacy catalog exports are rejected).
- [x] Create an automatic timestamped backup before every restore. Bulk import remains planned.
- [ ] Implement CSV export and a staged CSV import service with duplicate detection.
- [ ] Add Rust tests for cover copying, restore rollback, malformed backups, CSV parsing, and duplicate ISBNs.

### Agy

- [ ] Add native cover selection, preview, replace, and remove controls to the book form.
- [x] Build the backup restore confirmation and success/error states (automated interaction checks pass; manual picker and visual qualification remain open).
- [ ] Build a CSV import flow: choose file → map columns → validate → review → import.
- [ ] Show row-level validation errors without discarding the user's mapping or corrections.
- [ ] Add progress and completion summaries for large imports.

### Claude

- [ ] Prepare valid, malformed, legacy, duplicate-heavy, and Unicode backup/CSV fixtures.
- [ ] Verify interrupted and failed restores leave the original library unchanged.
- [ ] Verify backups restore authors, editions, copies, tags, collections, reading data, notes, and covers.
- [ ] Test cover imports using PNG, JPEG, WebP, oversized, corrupt, and unsupported files.
- [ ] Confirm all data workflows remain functional without internet access.

### Exit criteria

- [ ] A full export → delete test database → restore round trip preserves all catalog data.
- [ ] Failed imports and restores are atomic.
- [ ] Imported covers survive application restart and database backup/restore.

---

## Phase 2 — Faster, cleaner book entry

**Goal:** Make adding books quick while protecting catalog quality.

### Codex

- [ ] Define a provider-neutral metadata result model and confirmation payload.
- [ ] Add metadata-provider fallback support while keeping Open Library as the initial provider.
- [ ] Implement ISBN-10/ISBN-13 checksum validation and normalization.
- [ ] Add possible-duplicate detection by ISBN, title/author, and edition.
- [ ] Add commands for author, tag, collection, publisher, and series suggestions.
- [ ] Preserve manually entered values when metadata lookup fails or returns incomplete data.

### Agy

- [ ] Replace comma-separated author and tag fields with accessible removable chips and suggestions.
- [ ] Add a metadata confirmation screen that clearly distinguishes fetched and existing values.
- [ ] Design duplicate warnings with “open existing,” “add another copy,” and “continue anyway” choices.
- [ ] Add drag-and-drop cover support.
- [ ] Add “Save and add another” without losing reusable values such as collection or shelf.
- [ ] Improve inline validation and focus the first invalid field on submission.

### Claude

- [ ] Test ISBNs with spaces, hyphens, invalid checksums, missing results, and conflicting provider data.
- [ ] Verify multiple-author ordering and names containing commas, diacritics, or non-Latin characters.
- [ ] Verify duplicate detection does not prevent owning multiple copies or editions.
- [ ] Review every validation and provider error for clarity and recovery guidance.

### Exit criteria

- [ ] Manual entry always works without internet access.
- [ ] Metadata never overwrites confirmed user data silently.
- [ ] Multiple copies and editions can be intentionally distinguished.

---

## Phase 3 — Reading journal and history

**Goal:** Turn Meridian from an inventory into a useful personal reading record.

### Codex

- [ ] Extend reading records to support multiple sessions per library copy.
- [ ] Add create, update, finish, abandon, and delete-session commands.
- [ ] Support page-based progress and time-based audiobook progress.
- [ ] Add dated notes, quotes, and highlights linked to a reading session.
- [ ] Add annual reading-goal storage and progress calculations.
- [ ] Update statistics to avoid double-counting rereads unless explicitly requested.

### Agy

- [ ] Build a reading-session timeline on the book detail screen.
- [ ] Add quick progress updates from library and Reading views.
- [ ] Add start, finish, reread, and DNF flows with appropriate confirmation.
- [ ] Build quotes/highlights capture and browsing UI.
- [ ] Add yearly goal progress without turning the app into a productivity dashboard.

### Claude

- [ ] Test rereads spanning different calendar years.
- [ ] Verify page progress cannot exceed an edition's page count.
- [ ] Verify audiobook duration and progress calculations.
- [ ] Check statistics for active, completed, deleted, and overlapping sessions.
- [ ] Review the journal experience with libraries containing sparse reading data.

### Exit criteria

- [ ] A user can record multiple reads of the same copy without losing earlier history.
- [ ] Reading statistics remain mathematically consistent.
- [ ] Session notes and highlights survive export and restore.

---

## Phase 4 — Organization and discovery

**Goal:** Keep Meridian pleasant and efficient with thousands of books.

### Codex

- [ ] Add first-class shelf/location management and rename/move support.
- [ ] Add bulk commands for tags, collections, locations, status, and deletion.
- [ ] Implement saved smart collections backed by validated filter definitions.
- [ ] Add series queries with stable volume ordering.
- [ ] Add advanced search for exact phrases and field filters.
- [ ] Optimize list/search queries and indexes using the 10,000-book fixture.

### Agy

- [ ] Build multi-select and a restrained bulk-action toolbar.
- [ ] Add shelf and series browsing views.
- [ ] Build smart-collection creation using the existing filter language.
- [ ] Add the optional random-book picker from the supplied reference design.
- [ ] Add recently viewed and recently added surfaces where they improve navigation.
- [ ] Preserve usable layouts at narrow desktop widths and 200% scaling.

### Claude

- [ ] Measure startup, search, filtering, scrolling, and bulk-operation performance.
- [ ] Verify smart collections update automatically after edits.
- [ ] Test destructive bulk actions, cancellation, and failure recovery.
- [ ] Complete a WCAG 2.1 AA-focused keyboard and contrast audit.
- [ ] Verify every major workflow with 0, 10, 1,000, and 10,000 books.

### Exit criteria

- [ ] Search and filtering remain responsive with 10,000 books.
- [ ] Bulk changes are transactional and clearly summarized.
- [ ] Every core flow is keyboard accessible.

---

## Phase 5 — Release readiness

**Goal:** Produce a dependable, installable desktop release.

### Codex

- [ ] Add CI for TypeScript, React tests, Rust formatting, Rust tests, and Tauri builds.
- [ ] Produce MSI and NSIS installers.
- [ ] Configure Windows code signing and documented secret handling.
- [ ] Add rotating local logs with sensitive-data redaction.
- [ ] Add a diagnostics export containing version and non-sensitive environment information.
- [ ] Test clean install, upgrade, migration, uninstall, and reinstall behavior.
- [ ] Document the release and rollback procedure.

### Agy

- [ ] Complete final visual polish across light/dark themes and all empty/error/loading states.
- [ ] Create current release screenshots for Library, Details, Collections, Reading, Statistics, and Settings.
- [ ] Review all user-facing copy and destructive confirmations.
- [ ] Finalize onboarding, keyboard-shortcut help, and release notes.

### Claude

- [ ] Execute the complete acceptance matrix on a clean Windows user profile.
- [ ] Verify no development seed data appears in production.
- [ ] Test upgrade from every supported database schema version.
- [ ] Verify the signed installer and executable metadata.
- [ ] Complete a final privacy/offline audit.
- [ ] Approve or reject the release with documented evidence and blockers.

### Exit criteria

- [ ] CI is green from a clean checkout.
- [ ] The signed installer passes the complete acceptance matrix.
- [ ] Upgrade and rollback procedures are proven using real packaged builds.
- [ ] Meridian works normally with network access disabled.

---

## Suggested execution order

1. **Codex** starts each phase by defining migrations, domain models, and IPC contracts.
2. **Agy** begins the corresponding visual design and UI implementation as soon as those contracts stabilize.
3. **Claude** prepares review cases in parallel, then reviews the design, accessibility, implementation, and integrated result.
4. The phase owner closes failures before work begins on the next phase.

## Definition of done for every task

- [ ] Implementation is complete and understandable.
- [ ] Relevant automated tests pass.
- [ ] Errors are recoverable and user-facing messages are clear.
- [ ] Keyboard, focus, light theme, and dark theme behavior are verified.
- [ ] Offline behavior is preserved unless the feature is explicitly optional and network-based.
- [ ] `README.md`, architecture notes, and this roadmap are updated when behavior changes.

**October 8 backup increment:** version-2 full-catalog snapshots, isolated validation, transactional restore, automatic recovery files and desktop Settings controls are implemented. Six backup/storage tests, four restore-interaction tests and six installed native assertions pass; 12 frontend / 17 Rust / 30 native checks total. Covers remain separate, legacy catalog exports are not restorable, and abrupt-process/power-loss tests and manual dialog/accessibility acceptance remain open. See docs/BACKUP-RESTORE.md.
