# Managed covers and portable backup — October 8, 2026

The desktop book editor now offers Choose cover, Replace cover, a preview and Remove cover. Selecting an image imports a compact owned copy; Save changes/Add book attaches its portable reference to the catalog. Removing a cover changes the draft until the book is saved. Cancelling the system picker or a failed replacement keeps the previous cover. Metadata lookup preserves a locally imported cover. Browser preview labels and disables native import.

Settings reports actual stored-image count and MiB, with Refresh. This includes unattached images retained after cancelled edits, replacements, deletions or restores. Automatic garbage collection is deliberately deferred until a retention policy can protect older recovery copies.

## Storage

- PNG, JPEG and WebP are detected from content, irrespective of extension. Import accepts at most 20 MiB, dimensions at most 8,000 per axis and 24 million pixels; decoder allocation limits are also set. Allocation limits are best effort, while dimension bounds are checked before decoding.
- EXIF orientation is applied. Images fit within 600×600 pixels, maintaining aspect ratio, with no enlargement. Transparent pixels are composited over white and images are encoded as JPEG at quality 82 without source metadata.
- Each stored JPEG is at most 512 KiB. Its SHA-256 digest names the file; identical processed bytes share the same file. The catalog stores `meridian-cover:<64 lowercase hex digits>.jpg`, never the user's original absolute path.
- Files are written and synchronized through temporary files, then published without replacing existing files. An existing file must match its digest and bytes. Invalid imports leave no imported file or temporary residue. A cancelled edit can retain a successfully imported, unattached image.
- Every view resolves managed references through the native service into bounded JPEG data URLs. The frontend caches up to 128 resolutions. A failed load displays Cover unavailable. Remote URLs and packaged sample images still display normally; they are separate from managed assets.

The earlier 50–150 KB estimate remains an estimate, not a guaranteed per-cover size. Actual usage is shown in Settings. Encoding quality, dimensions, texture and source content affect the result.

## Portable archive

Settings Save backup now creates a `.meridian.zip`: one `catalog.json` containing the lossless version-2 schema-1 snapshot and `covers/<digest>.jpg` entries for precisely the managed images referenced by editions. Reading history, shared editions, identifiers and sequences remain preserved. Missing or corrupt referenced managed images abort saving; an existing destination is never overwritten.

Choose file opens a native picker for ZIP or JSON. ZIP contents are copied into isolated staging, then inspected with bounded reads. Only catalog.json and validated hash-named JPEGs are accepted. Unknown paths, directories, symlinks, mismatched digests, corrupt/oversized images, missing/extra managed images and invalid catalog graphs fail before touching live storage. Limits: 64 MiB catalog JSON, 512 KiB per JPEG, 100,001 entries and 2 GiB archive/total extraction. ZIPs are never generically extracted into the cover directory.

Confirmation shows catalog counts, included image count and external cover references. A digest binds restoration to the inspected file; changed files require a fresh review. The catalog replacement holds the service lock and an immediate SQLite transaction. A complete recovery ZIP of the previous catalog and its images is synchronized and published before replacement. New images are immutable additions, published before database commit; existing images are never deleted or overwritten. Failure rolls back the catalog and can leave harmless unused images and a retained recovery ZIP. Missing/corrupt previous images prevent restoration until repaired so the recovery backup remains complete.

Version-2 JSON without managed references remains accepted by the Settings picker. JSON alone cannot recover managed images onto another machine, so the picker refuses such files. The compatibility `restore_backup` JSON command can reuse validated local managed files but now also creates a complete ZIP recovery copy. Legacy version-1 exports remain unsupported.

Online URLs, packaged sample covers and other external references are not downloaded or embedded. Their count is shown before restore; offline portability is guaranteed only for imported managed covers. Import an image to own it locally. Existing local paths are not automatically read or migrated.

Recovery ZIPs are retained without automatic pruning. Larger catalogs may need significant temporary disk space: staging, incoming images and a complete recovery archive. Read/validation/compression work runs on native worker threads; the UI blocks duplicate restore submissions and cancellation once replacement has started.

## Evidence and remaining acceptance

- **15 frontend tests** pass, including managed-reference save/preview, failed/cancelled replacement and draft removal, plus validation/confirmation/busy-state/error checks for portable restore.
- **26 Rust tests** pass. Nine new tests cover PNG/JPEG/WebP, resizing/dedup/source removal, transparency/EXIF, corrupt/unsupported/oversized sources, tamper/no-overwrite, disk restore/reopen into empty cover storage, older reading sessions, previous-image recovery, rollback, malformed/missing/traversal ZIP entries, review-digest and recovery-write failures, safe save and JSON compatibility.
- **41 installed native WebView/IPC checks** pass: imported covers survive original-source deletion and subsequent launches, actual WebView decoding succeeds, duplicate imports reuse a file, and portable backup/restore preserves the complete book graph and image data. The separate test product uninstalled successfully. Raw report: `verification/native-smoke/e0d45b24-3cfd-4cdc-8b2a-ac1855b60e36/report.json`; portable evidence: [covers-native-smoke.json](evidence/covers-native-smoke.json).
- The compact editor was inspected at 600×500 CSS pixels in light/dark themes, with no document horizontal overflow and reachable Save controls. Screenshots: [light](evidence/cover-editor-compact-light.png), [dark](evidence/cover-editor-compact-dark.png). These screenshots use browser preview; native image decoding is verified separately above.
- Full standard verification builds normal MSI/NSIS installers, checks the Windows GUI subsystem and excludes the test driver. Test data is isolated; no real library was opened or altered.

Manual system-picker interaction, screen-reader checks, clean-profile installation, version-to-version upgrade, abrupt process interruption/power loss and large-image-library performance remain unqualified. ZIP path/error guards are tested; this is not a claim of a comprehensive archive security audit. The next personal-use acceptance increment should exercise normal installed workflows and updates against isolated real-shaped catalogs.

Implementation references: [image decoder limits](https://docs.rs/image/0.25.10/image/struct.Limits.html), [JPEG encoder](https://docs.rs/image/0.25.10/image/codecs/jpeg/struct.JpegEncoder.html), [ZIP reader](https://docs.rs/zip/8.6.0/zip/read/struct.ZipArchive.html).
