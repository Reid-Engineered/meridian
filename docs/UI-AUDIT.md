# Phase 0 UI audit — October 8, 2026

Scope: initial source/reference inspection followed by live light/dark preview, keyboard, dialog and compact-layout checks. Installed native WebView2 zoom at 200% also passed. See PHASE0-SMOKE.md for evidence and resolved findings. This is not WCAG certification; NVDA and exhaustive conformance remain open.

## Existing design tokens

`src/styles/app.css` is the current source of truth. Warm light surfaces, serif book headings and an accent brown follow the reference's library character. The reference uses a compact toolbar, shelf navigation, inline tags and a random picker; the implementation adds a prominent page heading and separate Collections/Reading/Statistics views. Shelves, inline tagging and the random picker are planned, not demonstrated parity.

| Token group | Current values |
| --- | --- |
| Light surfaces | bg #f5f1e9, sidebar #eee6d9, surface #fdfbf7, elevated #ffffff |
| Light text | text #342d29, muted #74695f, faint #7a6e61 |
| Accent | #955f3d, hover #7d4b2d, soft #ead8c7 |
| Dark surfaces | bg #1c1916, sidebar #211d19, surface #26211d |
| Dark text | text #eee7dc, muted #b3a99c, faint #a09385 |
| Typography | DM Sans body, Newsreader/Georgia serif headings |
| Layout | 240px sidebar; 205px below 1100px; bottom navigation below 760px |
| Shape | 12px base radius; dialogs/cards use local values |
| Focus | 2px accent outline with 2px offset |

Spacing is currently defined through local CSS values rather than a named scale. Preserve working layouts before consolidating these into tokens.

## Initial findings and follow-up

| Priority | Finding and source evidence | Effect and next step |
| --- | --- | --- |
| P1 | `ConfirmDialog.tsx` declares aria-modal but has no initial focus, focus containment, Escape handling or focus return | Keyboard users can leave the destructive dialog. Implement shared dialog focus behavior and verify with keyboard tests. |
| P1 | `BookForm.tsx` handles Escape but has no dialog semantics, initial focus, focus containment or return | Add/edit is not isolated for assistive technology; implement a shared accessible dialog boundary. |
| P1 | Author input joins/splits names on commas (`BookForm.tsx`) | Editing a legitimate surname-first author can change its identity. Replace with ordered chips before relying on metadata editing. |
| P2 | Form tabs have roles but no linked tab panels or arrow-key behavior | Complete the tab pattern and verify selected-panel announcements. |
| P2 | Book cards are clickable focusable articles (`BookCard.tsx`) without action semantics; Space does not prevent default | Use an accessible named primary action; avoid nested action propagation and scrolling on Space. |
| P2 | Native errors are rejected strings, while `BookForm.tsx` only displays `Error.message` | Specific recoverable errors become generic. Normalize IPC errors at the service boundary. |
| P2 | Faint/muted text uses low-contrast colors in light theme | Measured token contrasts below; increase text contrast while retaining the palette. |
| P3 | Search shortcut displays Command-K on Windows (`Topbar.tsx`), though Ctrl-K is implemented | Use platform-appropriate hint text. |

Follow-up: shared modal focus handling, keyboard tabs, native book-title buttons, native error strings, text contrast and platform shortcut hints are now implemented and verified. The comma-separated author issue remains for entry-quality work. Evidence is in PHASE0-SMOKE.md.

## Contrast and pending checks

Ratios are calculated from CSS token pairs using sRGB relative luminance, not sampled rendered pixels. Ordinary text requires 4.5:1 in the audit target; large text requires 3:1. See the computed values in the baseline record. Inspect actual text sizes/backgrounds before assigning final conformance results.

Passed: light/dark library and dialogs inspected, form/confirmation Tab wrapping, nested Escape/focus return, keyboard book/collection opening and installed native WebView zoom 200%. Pending: exhaustive reference comparisons, NVDA, OS text-only scaling, per-usage contrast and all empty/loading/error states.

## Mac redesign, step 1: foundation (October 9, 2026)

Design reference: the "Meridian for Mac" design canvas (Screens, Sheets & Alerts, Menus & Dropdowns). This step changes presentation only. No service, command or schema behavior changed.

- **Tokens.** `src/styles/mac.css` loads after `app.css` and re-points the existing token names (`--bg`, `--surface`, `--text`, `--accent`, …) to the Mac palette in light and dark, so every page picks it up. It adds glass, fill, panel and status-color tokens. UI type is the system font (SF Pro on macOS, Segoe UI on Windows), and headings use New York with Iowan Old Style and Georgia fallbacks. Unused drawer/topbar rules remain in the minified `app.css` until the pages are rebuilt in later steps.
- **Theme.** Light, Dark or Automatic (`src/theme.ts`). Automatic follows `prefers-color-scheme` live and is the default when no preference is stored. Existing stored `light`/`dark` values are kept. The toggle moved from the top bar to Settings → Appearance.
- **Window shell.** A floating sidebar (`Sidebar.tsx`) with All Books, Reading Now, status scopes (Want to Read, Finished, Did Not Finish), Statistics, Collections, a current-reading card and Settings. Status and collection rows set the existing `BookQuery.status` / `collectionId` filters, which the native query already supports. A unified toolbar (`Toolbar.tsx`) holds the title and count, the grid/list control, search (⌘K / Ctrl K) and Add (⌘N / Ctrl N). The add button is the new focus fallback.
- **Inspector.** `BookInspector.tsx` replaces the modal `BookDetailDrawer`. It is a non-modal side panel (the library stays usable and is not made inert). Escape or Close returns focus to the book that opened it. The remove action is labelled "Remove from library" and still confirms through the shared alert dialog.
- **macOS window.** `titleBarStyle: "Overlay"` with a hidden title puts the traffic lights inside the sidebar. The toolbar and sidebar top are `data-tauri-drag-region`s (`core:window:allow-start-dragging` added). These settings have no effect on Windows.
- **Narrow windows.** Below 1100px the inspector overlays the content. Below 760px the sidebar becomes a bottom bar and the toolbar wraps.

Review follow-up (PR #1): opening a book from a collection now closes the collection drawer, so the drawer's focus trap and z-index no longer hide the inspector. Escape closes the inspector wherever focus is, while modal layers still take Escape first. The narrow layout keeps All Collections in the bottom bar. Each fix has a regression test, and the two interaction tests fail on the previous code.

Verified: `npm run verify -- --quick` passes (frontend tests 22/22, frontend build, Rust storage tests, representative fixtures). The new tests cover theme resolution, the Automatic option, sidebar filtering and toolbar titling, the inspector being non-modal with Escape focus return (including Escape on the opener and modal precedence), and opening a book from a collection. The browser preview was inspected at 1440×900 in light and dark. Full `npm run verify` (including MSI/NSIS packaging) passed on Windows in review. Still unverified: the overlay title bar and window controls on a real Mac.

Still to come: library grid/list rebuild with filter popover and sort menu (step 2), the book sheet (step 3), the remaining pages (step 4), native menu bar, context menus and a Settings window (step 5), and Pick Next, Log Pages and undo (step 6).

## Mac redesign, step 2: library (October 9, 2026)

- **Toolbar controls.** The old dropdown filter bar is gone. The toolbar now holds the grid/list control, a **Filter** capsule, a **Sort** capsule and search, in that order. The Filter capsule opens a non-modal popover (`FilterPopover.tsx`) of native pop-up buttons for Status, Format and Collection, plus a Rating segmented control. Its label shows the number of active filters. The Sort capsule opens a menu (`Menu.tsx`, `menuitemradio`) with Sort By (Date Added, Title, Author, Publication Year, Rating) and Order (Ascending/Descending). Both close on Escape (focus returns to the capsule), on an outside click, or after a choice. They handle Escape before the inspector does.
- **Sort direction.** `LibraryRepository::order_by` accepts `<field>_<asc|desc>` and builds only whitelisted SQL. Unknown values fall back to date-added descending. The previous four values sort exactly as before. A Rust test covers every field in both directions, unrated-last ordering, and an injection-shaped value.
- **Search suggestions.** `LibrarySearch.tsx` is an ARIA combobox. From two characters it lists up to four matching books and three matching authors from the already-loaded catalog. Arrow keys and Enter open a book; choosing an author searches for that author. Escape closes the list first.
- **Filter chips.** Active filters and the search term appear as removable chips under the toolbar, with Clear All.
- **Grid and list.** Grid tiles are a single button ("Open <title>"). The status badge no longer sits on the cover art: the line under the title shows "Reading · 41%" or the author. The selected book gets an accent outline. The list view is a real `<table>` with Title, Author, Status (dot plus word), Rating, Format, Published and Added columns, alternating rows and an accent-filled selected row. Added is hidden while the inspector is open.
- **Continue Reading.** On the unfiltered library, up to two books in progress appear above the grid, most recently started first.
- **Empty states.** A first launch shows "Your shelves are waiting" with Add Book. A search or filter with no matches names the search and offers Clear Filters and Add a Book.

Verified: frontend tests 29/29 (7 new: filter popover with chips and Escape focus return, sort menu keyboard and direction, search suggestions, list view, no-results, empty library, preview sort parity) and the new Rust sort test. The browser preview was checked at 1440×900 with each menu open, in light and dark. Not done in this step: shelf (location) scopes, the form's pop-up menus (step 3), and native menu-bar and context menus (step 5).
