# Custom appearance themes

Native dropdown options use the active theme's opaque surface and text colors,
including the Status, Format and Collection filters and book-editor dropdowns.
The default Light palette explicitly requests a light native color scheme;
Dark and Mocha request dark controls. Keep native keyboard selection and system
selection highlighting when changing these styles. Windows WebView2 visual
confirmation passed in an isolated native smoke build: the expanded Format menu
shows all options on dark and light surfaces, and Down/Enter applies Hardcover
with the corresponding filter chip and result count. Screenshots are saved in
[`docs/evidence/dropdown-fix/`](evidence/dropdown-fix/) (dark/light open menus,
keyboard selection, and the quick verification report).

## Meridian 95

Settings > Appearance > Theme offers **Meridian 95**. The explicit `windows-95`
preference persists across launches and remains independent of operating-system
light/dark changes. Automatic continues to select Light or Dark.

The theme adapts SolidCraft 95's silver faces, navy/white selections, recessed
white fields, raised controls and subtle 3–4px corners. Existing layout, button
hit areas and library artwork remain. Its sidebar replaces the standard wordmark
with an original pixel-grid open-book logo and outlined bitmap MERIDIAN lettering;
other themes retain the official wordmarks. It uses local Tahoma /
Segoe UI fonts; no IBM Plex files are bundled. CSS uses two 1px bevel bands as an
adaptation of upstream's two 0.5 logical-point bands. Glass blur and broad soft
shadows are removed only within this theme. Keyboard focus is distinct from
persistent selection, and selected navigation icons/counts use white ink.

`src/styles/windows-95.css` loads after the existing styles and scopes all rules
to `[data-theme="windows-95"]`. The Windows desktop caption becomes navy with
silver caption buttons; native window operations and dimensions are unchanged.
Browser preview omits native caption controls. macOS/Linux retain system window
decorations. See [third-party notices](../THIRD_PARTY_NOTICES.md) and the
[source research](research/solidcraft-95-sources.md). The license notice is also
included in the packaged frontend at `public/licenses/solidcraft-95.txt`.

### Verification

`npm run verify -- --quick` passes the frontend tests (including selecting
Meridian 95, restoring it on remount and switching back to Light), the Rust
tests, the TypeScript check/production build and the isolated 0/10/1,000/10,000-book
catalog fixtures.

A headless Chrome render of the production bundle checked theme selection,
switching back and Settings overflow at 100/125/150/200% viewport scales, and
Library grid/list, Reading, Collections, Statistics, Settings, filters, inspector
and book-editor screens were inspected visually.

An isolated Windows smoke build was then exercised in its native WebView2 window
against marked test storage, not a personal library: mouse and keyboard
navigation through the sidebar, Sort, Filter, toolbar search, suggestions and
ISBN controls; applying a Reading filter; opening/canceling book editors;
cover and Close hover; and Statistics icon contrast. Computed styles confirmed
flat menu focus, recessed selected/expanded focus, a single focus indicator on
the search/ISBN wells, the default-action border, flat cover shadows and
`#c42b1c`/white Close hover.

Not yet qualified: installer installation/upgrade, comprehensive native scaling,
screen readers, and macOS/Linux rendering.

## Earlier custom themes

Settings offers Strawberry, Mocha and Ube alongside Light, Dark and Automatic. Explicit custom preferences persist across launches and do not follow OS theme changes. Strawberry and Ube use a light color scheme; Mocha uses a dark color scheme and the official logo's light-on-dark wordmark. The Windows caption uses the same theme tokens as the app and retains the native controls from PR #4.

Theme controls wrap within their card at narrow widths. Existing library, icon sources and storage behavior are unchanged. The theme preference resolves to a known palette rather than an unrestricted string. Tests cover restoring, applying and persisting all three custom themes and selecting them from Settings.

October 9 integration verification: `npm run verify -- --quick` passed all 38 frontend tests, 27 Rust tests, the production frontend build, and four isolated catalog fixtures. The Windows control tests remain included. This theme-only increment did not rebuild the desktop installers or repeat the installed native smoke run; the existing recovery installer predates these themes.
