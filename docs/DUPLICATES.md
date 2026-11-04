# Duplicate books and owned copies

Saving an addition or edit checks the entire catalog, excluding the edited copy. Valid ISBN-10 and ISBN-13 values are compared as equivalent ISBN-13 values; spaces, hyphens and lowercase check digit x are supported. Invalid legacy identifiers warn on identical spelling, but are not considered validated ISBNs. Title and at least one author must match after case and whitespace normalization for a possible match. Different formats and years are displayed for review, never automatically merged. Title-only matches and missing authors do not trigger warnings; fuzzy spelling and translated titles remain outside this increment.

The review offers Open existing and Add another copy. A title/author match also permits Keep as separate edition. An ISBN match requires another copy because schema 1 keeps ISBNs unique per edition. The native create service also rejects equivalent ISBNs on separate editions, including ISBN-10/13 equivalents. A duplicate-check failure keeps the draft and prevents saving until retry succeeds.

Another copy reuses the selected edition and work, keeping their title, authors, identifiers, cover and publication details. The submitted copy fields—reading state, notes, review, location, condition, acquisition date, tags and collections—are stored independently in one transaction. Editing title, authors and edition metadata affects every copy sharing that work/edition; the edit form explains this. Personal fields remain independent.

To resolve existing duplicates, edit the entry you want to keep and select Save changes. The review excludes that entry and offers Review merge on matches. Confirm merge uses the saved kept entry, not unsaved form edits. Its title, edition, personal fields and current reading state win. Both entries' tags and collections are unioned. All reading records move to the kept copy; a final copy of its current reading record preserves the selected current state under the existing latest-ID display rule. The removed entry's full saved details and notes are archived in the kept entry's notes. The removed copy is then deleted. Unreferenced work/edition rows and managed cover files are retained.

Native merge obtains an immediate SQLite transaction before taking a complete schema-1 database snapshot. It saves `before-merge-<uuid>.json` under the application's `recovery` directory, then merges and commits. Recovery-write or merge failure leaves both copies intact; an already written recovery file is retained after a failed merge. Existing managed covers are retained, so this database snapshot can restore the pre-merge graph through Settings' JSON restore on this installation. Use a portable ZIP backup for moving that library to another installation. No schema migration is needed.

When creating or editing an entry, matching ISBN identifiers on editions with no remaining owned copies are released within the write transaction. Removing the last copy therefore does not leave its ISBN permanently unavailable. This never removes an edition that still has an owned copy, and a failed write rolls back the cleanup.

Browser preview simulates copy creation and merge using local storage. It preserves the removed entry's visible details in notes and saves a pre-merge catalog under `meridian-before-merge`; preview has no native reading-history table. Native tests use isolated memory/disk libraries, never application data.

## Commands

| Command | Input | Result |
| --- | --- | --- |
| `find_duplicates` | `{input, exclude: number or null}` | Array of `{book, reason: "isbn" or "titleAuthor"}`; strongest matches first |
| `create_book_copy` | `{source, input}` | New `BookDetail`; missing source and invalid copy fields are recoverable errors |
| `merge_book_copies` | `{keep, remove}` | Kept `BookDetail`; distinct existing IDs required; automatic recovery before mutation |

The service/command boundary owns matching, recovery and persistence; React only presents the review and choices. Duplicate matching scans compact identity rows, loading complete details only for exact ISBN or title candidates.

## Verification

Regression checks cover ISBN equivalence/checksums, Unicode safety, normalized title/author matches, different editions, self exclusion, independent copy data and invalid-write rollback; merge tests cover membership union, complete history, selected current state, notes/conflicts, disk reopen, recovery restoration, injected delete rollback and failed recovery publication. Frontend checks cover cancelled review, opening existing entries, copy/separate choices, changed drafts, lookup/save failures, confirmation, retry and repeated-action/Escape prevention. Installed UI and screen-reader acceptance remain manual checks.

October 10, 2026: required quick verification passed with 64 frontend tests, 32 Rust tests, the production frontend build, and isolated catalogs of 0, 10, 1,000 and 10,000 books (integrity and reopen checks passed). The desktop command integration also passed a GNU-toolchain compile check. Test reports are in verification/latest.json; installed UI and screen-reader checks remain unrun.

October 10 packaging: normal GNU release executable, MSI and NSIS bundles built successfully; the Windows GUI-subsystem check passed. The dated NSIS installer was copied to the shared builds folder and its SHA-256 matched the generated bundle. This build has not been installed or exercised against the personal library.
