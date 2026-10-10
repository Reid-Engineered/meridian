# Meridian v0.1.1 — Duplicate handling

Meridian now checks for existing books when you save an addition or edit. Matching ISBN-10 and ISBN-13 values identify the same edition; matching title and author identify possible duplicates. The review shows format, year and location so you can distinguish editions and owned copies.

- Open the existing entry or add another owned copy with independent notes, location, tags, collections and reading state.
- Keep a separate edition when the match is based on title and author rather than an identical ISBN.
- Review and confirm a merge of existing entries. Keep the selected entry's details and current reading state; combine tags and collections, retain every reading record, and archive the removed entry's notes and details.
- Save an automatic recovery snapshot before merging. Recovery-write and merge failures leave the original entries intact.
- Add a book again after removing its last copy without its old ISBN blocking the save.

To merge existing entries, edit the entry you want to keep, select Save changes, then choose Review merge. Unsaved form edits are not included in a merge. Edition details remain shared between copies; personal fields are independent.

No database schema migration is required. Existing libraries and portable ZIP backups remain supported. See [duplicate handling and recovery](DUPLICATES.md) for the detailed behavior.

Windows packages are unsigned. macOS packages use ad-hoc signing and are not notarized. Automated verification covers the frontend, native data operations, rollback/recovery, and isolated catalogs through 10,000 books; installed-app upgrade, screen-reader and native duplicate-dialog acceptance remain manual checks.
