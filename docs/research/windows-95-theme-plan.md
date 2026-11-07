# Meridian 95 theme implementation plan

Research completed 2026-11-06 against Meridian checkout `theme-integration` at `f1d85fb` and SolidCraft revision `871014f955a76fd308ce156e68c93e6372906005`. The implementation now ships in PR #9: it adds the theme preference, scoped stylesheet, Settings choice and a theme-specific sidebar wordmark. This document records the implementation approach and adaptations.

## Recommendation

**Meridian 95** is an optional built-in Meridian theme with persisted identifier `windows-95`. It adapts SolidCraft 95's silver controls, navy selection/title bars, directional bevels, and restrained corners to Meridian's current layout. Existing control sizes, navigation and library covers remain. The sidebar uses an original pixel-grid open-book logo and outlined bitmap MERIDIAN wordmark in this theme; other themes retain the official branding. The theme is available on every platform; only the existing Windows desktop caption receives application-controlled window styling.

The source is a contemporary interpretation of Windows 95. It uses 3–4 logical-point theme radii and IBM Plex fonts, rather than uniformly square corners and a historical bitmap font. Source details and component-specific exceptions are recorded in [the research note](solidcraft-95-sources.md).

## Visual specification

- Silver `#c0c0c0` for shell, toolbars, panel faces and ordinary buttons; white `#ffffff` for editable fields and library list/grid content wells. Using white for the library content is a Meridian adaptation.
- Black text; `#404040` for readable secondary copy. Reserve upstream `#808080` primarily for disabled states and borders: it needs contrast checking before use for small enabled text on silver.
- Navy `#000080` with white text/icons for selected navigation, selected segments and the Windows caption. Silver normal action buttons; hover `#dfdfdf`; held buttons reverse their bevel and can use navy/white, following the upstream action recipe. Selected segments remain navy and recessed. Apply states by component rather than treating every selected control alike.
- Raised edges: white/light gray on top and left, black/gray on bottom and right. Recessed fields reverse the appropriate bands. Introduce named bevel tokens distinct from decorative drop-shadow tokens. SolidCraft paints two 0.5 logical-point bands; first evaluate 0.5px CSS bands at 100%, 125%, 150% and 200% scale, then document a 1px-per-band adaptation if WebView rendering is unreliable.
- Use 3px controls/small panels and 4px larger containers as the initial CSS adaptation of the source's logical radii. Eliminate glass blur and broad soft shadows within this theme. Keep useful button hit areas and spacing.
- Teal `#008080` is SolidCraft's CAD viewport color, not its universal panel background. Omit it from Meridian's primary reading surfaces; reserve it for an optional small decorative accent.
- Preserve visible keyboard focus, error messaging and readable statuses. Any dotted focus treatment would be a Meridian choice, not an upstream requirement. Keep focus distinct from persistent selection.
- Retain existing command icons and book artwork; do not import CAD artwork. The theme-specific sidebar logo and bitmap wordmark ship as vector paths in `public/brand/meridian-logo-retro.svg`, selected through `Sidebar.tsx` and scoped CSS. UI text uses the local `Tahoma, "Segoe UI", sans-serif` stack. These are intentional adaptations; bundling IBM Plex Sans/Mono for closer SolidCraft typography remains optional follow-up work with OFL notices.

## Implementation sequence

1. **Register and persist the theme.** `THEME_IDS` in `src/theme.ts` defines accepted IDs, the derived `ThemePreference` type and the Settings choices. Settings provides exhaustive labels/icons and uses the existing Lucide monitor icon for Meridian 95. Automatic still maps to OS light/dark.
2. **Add a scoped stylesheet.** Create `src/styles/windows-95.css`, imported after `mac.css` in `src/main.tsx`. Put all new rules under `[data-theme="windows-95"]`; define every relevant existing palette token, `color-scheme: light`, text/selected ink, font, radii and bevel tokens. Do not rely on `--radius` alone: many existing component radii are literal values. Scope any new font assets to this theme if later added.
3. **Style the actual shell and common controls.** Cover `.mac-sidebar`, `.mac-toolbar`, `.mac-inspector`, `.glass`, search/filter controls, `.seg`, theme choices, buttons, fields, menus and popovers. These `mac-*` classes are Meridian's active cross-platform shell. Keep its floating sidebar geometry initially; replace translucent faces and rounded pills with opaque beveled surfaces. Use inset shadows or non-interactive pseudo-elements to avoid changing layout or obscuring hit targets. Preserve circular controls when the shape communicates their purpose.
4. **Complete all pages and overlays.** Audit Library grid/list selection, Collections, Reading, Statistics, Settings, inspector, book editor, confirmation/duplicate dialogs, toasts and empty/loading/error states. Override hardcoded warm colors, gradients, rounded badges and hover lift where they conflict with this theme. Use white content wells and silver framing; avoid beveling each book cover. Ensure selected-state descendants do not retain navy accent ink on navy backgrounds.
5. **Style Windows caption controls.** In the same stylesheet, give `.window-chrome` a navy face/white brand text and its controls silver raised faces with black glyphs. Preserve the current 32px strip, hit areas, drag regions, services and maximize/restore behavior. Avoid extra React state unless a specific visual behavior needs it. macOS/Linux retain native decorations; browser preview continues to omit native controls.
6. **Document attribution and behavior.** Update `docs/CUSTOM-THEMES.md`; add a third-party notice retaining SolidCraft contributors' 2026 copyright, the full chosen MIT permission/license notice, pinned source and a clear statement of adaptation. Upstream offers MIT OR Apache-2.0. If fonts are bundled later, include the separate IBM Plex OFL notices. Update `docs/WINDOWS-CHROME.md` if caption appearance warrants it.

## Acceptance and verification

- Extend `src/theme.test.tsx` for restore/apply/persist, independence from OS changes, and switching back to an existing theme. Extend the Settings selector coverage in `src/components/shell.test.tsx` for the new choice and `aria-pressed` state.
- Run the required `npm run verify -- --quick` after frontend work. Theme additions do not require changes to library services, Rust, database schema, installer identity or Tauri capabilities. If packaging changes enter scope, run full `npm run verify`.
- Visually inspect normal/hover/pressed/selected/focused/disabled/error states across the listed surfaces. Test pointer and keyboard activation, including Enter/Space, and confirm focus remains visible against navy selection.
- Inspect at 100%, 125%, 150% and 200% display/WebView scales, narrow widths and a long theme selector. Check bevel crispness, clipping, overflow, native selects, wrapped labels and modal boundaries. Verify switching back removes all retro styling. Automated DOM tests alone cannot prove these visual properties.
- In a separate isolated desktop build/profile, verify Windows drag, minimize, maximize/restore and close; dialogs and caption controls must remain reachable at 200% zoom. Browser screenshots cannot qualify native window behavior. Do not use the user's actual catalog for acceptance.

## Delivery boundary

Implement in two coherent increments: (1) registration plus shell/common-control styling, (2) complete surface audit, caption styling, notices and verification. Review the Library and Settings appearance early, then finish the full surface pass. No external theme library or general theme-engine rewrite is needed for this addition. Existing unrelated checkout changes should remain untouched.

Runtime fidelity is still unverified: this research inspected upstream text/source, not a running SolidCraft window. CSS band widths and font choices above are explicit Meridian implementation decisions, not claims of pixel-exact parity.

## Primary sources

- [SolidCraft UI kit](https://docs.solidcraft.io/dev/ui-kit.html)
- [Pinned SolidCraft 95 theme](https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/assets/styles/ui/themes/solidcraft-95.json)
- [Pinned bevel renderer](https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/theme.rs#L363-L529)
- [Attribution](https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/ATTRIBUTION.md) and [MIT license](https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/LICENSE-MIT)
