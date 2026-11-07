# Custom appearance themes

## Windows 95

Settings > Appearance > Theme offers **Windows 95**. The explicit `windows-95`
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

November 6 verification: `npm run verify -- --quick` passed 66 frontend tests,
32 Rust tests, the production build and isolated 0/10/1,000/10,000-book fixtures.
The added application test selects Windows 95, remounts to restore it and
switches back to Light. Existing window-operation tests still pass.
An isolated headless Chrome render of the production bundle checked theme
selection/color, switching back, and Settings horizontal page overflow at
100/125/150/200% equivalent viewport scales. Library grid/list, Reading,
Collections, Statistics, Settings, filters, inspector and book-editor screenshots
were visually inspected. That initial browser evidence did not qualify native
WebView2 or installed-app behavior, and installers were not rebuilt at that
stage. The native review follow-up below records the subsequent Windows checks.

### Review follow-up verification

The review follow-up narrows bevel focus rings to beveled controls, preserves
recessed focus for selected/expanded controls, and gives compound search/ISBN
fields one focus indicator on their containing well. Applied filters use navy
text, default actions have a black outer border, Close hover is red/white,
cover hover shadows stay flat, and Statistics icon circles use light gray.
`THEME_IDS` now supplies the accepted IDs, derived type and Settings options;
labels/icons are exhaustively checked against that type.

`npm run verify -- --quick` passed 73 frontend tests, 32 Rust tests, the TypeScript
check/production build and all four isolated catalog fixtures. A separate
`npm run build:desktop -- --smoke` produced the isolated Windows test build and
NSIS bundle. The current frontend was exercised in its native WebView2 window
against marked test storage, not the personal library: mouse and keyboard
navigation through the sidebar, Sort, Filter, toolbar search, suggestions and
ISBN controls; applying a Reading filter; opening/canceling new/existing book
editors; grid-cover and Close hover; and Statistics icon contrast. Computed
styles confirmed flat menu focus, recessed selected/expanded focus, no outline
or shadow on inner search/ISBN inputs, the Save default border, flat cover
shadows and `#c42b1c`/white Close hover. These were native executable checks;
installer installation/upgrade, comprehensive scaling, screen readers and
macOS/Linux rendering were not requalified. Local evidence is under
`verification/windows95-review-native/` (not committed).

## Earlier custom themes

Settings offers Strawberry, Mocha and Ube alongside Light, Dark and Automatic. Explicit custom preferences persist across launches and do not follow OS theme changes. Strawberry and Ube use a light color scheme; Mocha uses a dark color scheme and the official logo's light-on-dark wordmark. The Windows caption uses the same theme tokens as the app and retains the native controls from PR #4.

Theme controls wrap within their card at narrow widths. Existing library, icon sources and storage behavior are unchanged. The theme preference resolves to a known palette rather than an unrestricted string. Tests cover restoring, applying and persisting all three custom themes and selecting them from Settings.

October 9 integration verification: `npm run verify -- --quick` passed all 38 frontend tests, 27 Rust tests, the production frontend build, and four isolated catalog fixtures. The Windows control tests remain included. This theme-only increment did not rebuild the desktop installers or repeat the installed native smoke run; the existing recovery installer predates these themes.
