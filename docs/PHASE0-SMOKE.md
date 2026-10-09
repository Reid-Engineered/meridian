# Phase 0 desktop and keyboard follow-up — October 8, 2026

The installed native smoke app passed 24 WebView2/IPC checks and was uninstalled. Five UI regressions and live browser checks verify corrected dialog behavior. No real Meridian library or existing installation was used.

## Packaging defect

The earlier GNU package compiled and bundled but failed to launch with exit code 3221225781. Executable imports showed a missing `WebView2Loader.dll`. The dependency already copies that DLL into the target output; the installer omitted it. `scripts/desktop-build.mjs` now includes it on Windows GNU builds. Standard verification uses this wrapper. The installed smoke package launched successfully after the fix.

## Native evidence

The `smoke-test` Cargo feature injects a driver after the native webview loads. It calls registered production commands through real IPC, services and SQLite. Its hidden window creates WebView2 and loads built React assets. A separate product name/identifier and an absolute marked test directory isolate the run. Normal builds contain neither driver nor test commands.

| Process stage | Checks | Result |
| --- | --- | --- |
| Initial | 8 | Empty release catalog; no seeds; ordered Unicode authors/relations; update; invalid-write rollback; search; collection rename; export |
| Reopen | 3 | All saved book fields and both memberships preserved; statistics agree |
| Scaled | 7 | Persistence repeated; native zoom 2.0; compact navigation; no document horizontal overflow; visible Add book |
| Cleanup | 6 | Persistence repeated; removing a collection keeps the copy/remaining membership; copy and collection cleanup |
| Uninstall | Separate result | Test product's installed executable removed |

Checked report: [native-smoke.json](evidence/native-smoke.json). Raw report/databases remain in `verification/native-smoke/657f40c6-7af9-48f5-a2fd-6209361efd86/` (ignored). WebView2 emits a window-class unregister diagnostic on test-driven exit; processes exit successfully and saved fields compare correctly. Normal user-driven shutdown has not been investigated for that diagnostic.

This proves installation on the existing Windows user profile and native command execution, rather than clean-profile, MSVC, upgrade or signed-installer qualification. Browser UI actions below use local storage; independent native IPC checks prove SQLite persistence.

## Keyboard and layout

- Shared modal handling isolates background branches with `inert`, initializes focus, wraps Tab/Shift-Tab, closes only the top layer on Escape and restores the opener. It covers book/collection forms, confirmations and drawers.
- Confirmation starts on Cancel and associates explanatory text with the alert dialog. Book tabs support arrows, Home/End, one tab stop and a linked panel. Missing-title validation focuses its field across tabs.
- Global new/search shortcuts preserve active modal context. Native rejected-string errors remain visible without erasing drafts.
- Book titles use native buttons; passive ratings no longer expose inactive rating buttons. Collection cards support Enter/Space. Windows hints display Ctrl.
- Light muted/faint text contrasts against the surface are 5.17:1 and 4.80:1; dark faint text is 5.32:1. These token measurements do not establish exhaustive WCAG conformance.
- Compact layouts retain visible Add book and leave space above navigation. Small dialogs scroll and form save/cancel controls remain reachable.

All five UI regressions pass: global shortcuts during confirmation, safe focus/background isolation/wrapping, nested collection Escape/focus return, tab navigation, and missing-title focus/rejected-write draft preservation. The original three frontend service tests also pass.

Live checks passed for book create/edit with Unicode authors, tags, reading progress, collection membership and notes; reload persistence; collection creation/keyboard open; nested rename cancellation; keyboard book-details open; confirmation Cancel-first focus/wrapping; Escape focus return; and cleanup of only newly created fixtures. Light/dark modes and a compact 600×375 CSS viewport were inspected. The compact save control lies inside the viewport without document horizontal overflow. Native 200% zoom is independently checked above.

Screenshots: [light library](evidence/phase0-library-light.png), [dark confirmation](evidence/phase0-confirm-dark.png), [compact form](evidence/phase0-form-compact.png).

## Outstanding evidence

NVDA execution, clean-profile installation, upgrades/downgrades, OS text-only scaling, exhaustive contrast and all error/empty states remain open. Shelf navigation, inline tagging and the reference random picker are planned. SQLite dateAdded defaults use UTC, which can differ from the user's local day near midnight.

The subsequent database backup/restore increment is now implemented, with round-trip, recovery and failure checks. See BACKUP-RESTORE.md for current evidence, including cover-file and manual acceptance limits.
