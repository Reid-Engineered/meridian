# Custom appearance themes

## Windows 95

Settings > Appearance > Theme offers **Windows 95**. The explicit `windows-95`
preference persists across launches and remains independent of operating-system
light/dark changes. Automatic continues to select Light or Dark.

The theme adapts SolidCraft 95's silver faces, navy/white selections, recessed
white fields, raised controls and subtle 3–4px corners. Existing layout, button
hit areas, library artwork and official branding remain. It uses local Tahoma /
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
were visually inspected. This is browser evidence,
not native WebView2 or installed-app qualification. Hands-on caption interaction,
native scaling, screen readers and macOS/Linux rendering remain unverified.
Installers were not rebuilt for this frontend-only change.

## Earlier custom themes

Settings offers Strawberry, Mocha and Ube alongside Light, Dark and Automatic. Explicit custom preferences persist across launches and do not follow OS theme changes. Strawberry and Ube use a light color scheme; Mocha uses a dark color scheme and the official logo's light-on-dark wordmark. The Windows caption uses the same theme tokens as the app and retains the native controls from PR #4.

Theme controls wrap within their card at narrow widths. Existing library, icon sources and storage behavior are unchanged. The theme preference resolves to a known palette rather than an unrestricted string. Tests cover restoring, applying and persisting all three custom themes and selecting them from Settings.

October 9 integration verification: `npm run verify -- --quick` passed all 38 frontend tests, 27 Rust tests, the production frontend build, and four isolated catalog fixtures. The Windows control tests remain included. This theme-only increment did not rebuild the desktop installers or repeat the installed native smoke run; the existing recovery installer predates these themes.
