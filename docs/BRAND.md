# Official Meridian logo

Adopted October 9, 2026: an open-book M with a vertical meridian spine, in copper and parchment. Canonical wordmarks and transparent symbols are in `public/brand/`; the icon uses a charcoal rounded square. Wordmarks are vector outlines and need no installed fonts.

The sidebar switches wordmarks with the resolved theme. The Windows caption keeps the existing native window operations, layout, drag region and accessibility behavior; its icon comes from `public/favicon.svg`.

Desktop master and small-size sources are in `src-tauri/icons/source/`. Run `npm run icons` to regenerate PNG, ICO and ICNS assets, including the small-size entries. Keep the favicon and `public/brand/meridian-icon.svg` synchronized with the master source. Preserve SVG proportions and use the symbol when a wordmark would be narrower than 120px.

This branding change is based on `5018925`, including the merged library redesign and the Windows caption work from PR #4. It intentionally retains those features rather than rebuilding the earlier UI. Library storage, backup formats and application identity are unchanged.

## Recovery verification — October 9, 2026

Full verification passed: 35 frontend tests, 27 Rust tests, isolated catalogs at 0/10/1,000/10,000 books, the production frontend build, and regular Windows MSI/NSIS bundles. A separate installed smoke product passed all 56 native checks and uninstalled successfully. Those checks exercise the production minimize/maximize/restore controls, light/dark themes, modal caption access and 200% scaling. No personal library was opened.

The corrected regular installer was copied before building the separate smoke product to `builds/Meridian-2026-10-09-recovered-logo-setup.exe` in the chat workspace. It is the regular app, not the isolated test product. Existing manual acceptance limitations from `WINDOWS-CHROME.md` still apply, including hands-on dragging and edge resizing.
