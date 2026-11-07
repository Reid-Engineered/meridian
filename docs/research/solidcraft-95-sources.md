# SolidCraft 95: first-party source research

Researched 2026-11-06. Upstream snapshot: `871014f955a76fd308ce156e68c93e6372906005` (main when fetched). Research only; no Meridian implementation or implementation plan. Read applicable `theme-integration/AGENTS.md`; no additional AGENTS.md found under docs.

## Evidence and scope

The [UI-kit docs](https://docs.solidcraft.io/dev/ui-kit.html) and [theme JSON][theme] were accessible. Geometry and behavior below come from source at the pinned revision, rather than inferred Windows 95 conventions. Docs are live and unversioned. An initial PowerShell web request failed locally; retrying with `-UseBasicParsing` retrieved the source successfully. No required text evidence remained inaccessible. No running SolidCraft instance, screenshot comparison, or display-scale validation was performed; raster appearance is unverified.

## Palette

Core face/background: `#c0c0c0`; editable fields: `#ffffff`; text: `#000000`; dim text/borders: `#808080`; hover: `#dfdfdf`; accent/selection/title bar: `#000080`; selected/title-bar ink: `#ffffff`; viewport: `#008080`. Form dim ink is separately `#404040`. Validation uses error ink `#800000` on `#ffffc0`, success `#008000` on `#c0dcc0`; general error/warning tokens are `#ff0000`/`#ffff00`. `accent_soft` is silver, not pale blue. [theme][theme]

The appendix preserves **every explicit color mapping**, including CAD-specific roles and alpha values, grouped by equal value. Eight-digit colors are RGBA, not ARGB. The JSON has `base: light`, `format: solidcraft-theme/1`, `name: SolidCraft 95`, `order: 70`, and original-theme provenance. [theme][theme]

## Geometry and radii

- Bevel width is **0.5 logical UI points per band**, two bands. Raised outer top/left = white, outer bottom/right = black; inner top/left = `#dfdfdf`, inner bottom/right = `#808080`. Recessed outer top/left = `#808080`, outer bottom/right = white; inner top/left = black, inner bottom/right = `#dfdfdf`. [theme][theme], [Bevel::paint][bevel]
- Band centerlines inset by `(index + 0.5) × width`: **0.25 and 0.75 points**; radius decreases by that inset. Rounded path segments choose upper/lower color using normalized midpoint coordinates: `relative.x + relative.y < 0`. No hit-target or layout expansion. Invalid/nonfinite rectangles or minimum dimension ≤ `4 × width` omit the bevel. Inputs first shrink their rectangle by **1 point**, then paint the recessed bevel. Containers paint a raised bevel over their existing frame. [renderer][bevel]
- Border role widths are all **1 point**: primary `#404040`, secondary `#808080`, tertiary `#a0a0a0`, container/control `#808080`. No dotted pattern or primary-inset override is specified. [theme][theme]
- Theme radii: `radius_sm=3`, `radius_md=3`, `radius_lg=4`, `radius_xl=4`, `control_radius=3`, `sketch_mode_radius=3` points. This theme is rounded. Form scopes apply control radius 3 to interaction states; generic egui visuals instead derive inactive/active/open radius `radius_sm / 2` (integer **1**), hovered radius `radius_sm − 1` (**2**), and window/menu radius 3. Compound segments round only exposed ends. [theme][theme], [form scope][layout], [generic visuals][visuals], [segments][choice]

## Selected, pressed, focus, disabled

Behavior is component-specific; the JSON alone does not define a single universal state recipe.

- Normal, primary, and SmallSelected action buttons in a bevel theme initially use silver face/black ink. Hover uses `#dfdfdf`; held press uses navy/white. Focus/hover/press/selected requests the control-role border; its explicit theme color resolves to **gray**, even when the caller passes navy as fallback. SmallSelected remains recessed when released, while its released fill stays silver. Danger buttons keep their error-colored face and mix it toward form ink by 12% on hover or 24% on press. [button appearance][actions], [border resolution][bevel]
- Bevel recession is `selected || pressed`. Press means an enabled pointer-down response, or focused Space/Enter held down. The action fill additionally requires the pointer still be inside for pointer pressing. Ghost buttons omit bevels. Disabled bevel colors use `gamma_multiply(0.45)`; action ink becomes form-dim, with native disabled rendering also applicable. No text displacement is added by the shared bevel painter. [renderer][bevel], [actions][actions]
- Default selected segments use navy/white and semibold text with recessed bevels; workspace-accent and primary variants have separate palettes. Do not replace all selected fills with silver based on SmallSelected's special case. [segments][choice]
- Focus retains component/native indicators; there is **no theme-wide dotted focus rectangle token**. Form text selection uses navy background and a 1-point form-primary selection stroke; global visuals use silver selection fill and navy stroke instead. Numeric fields retain native editor focus and optionally add a **1-point workspace/sketch accent outline**, only during active tool/dialog contexts when that accent differs from the global accent. Warning-field outlines remain 1.5 points. [form scope][layout], [global visuals][visuals], [number focus][numberfocus], [fields][fields]

## Typography

No font override is present in SolidCraft 95 JSON. Shared defaults are **IBM Plex Sans** variable font at 400/500/600/700; **IBM Plex Mono Regular** for numeric/expression text. Titles/selected labels use 600, selection fields/status messages 500, compass letters/primary OK 700. User font preference and language/symbol fallbacks can alter the actual face. [font documentation][fontdocs], [font source][fonts]

Shared type tokens in logical UI points: badge 9.5, micro 10, panel 10.5, small 11, caption 11.5, body 12, label 12.5, button 13, heading 14; triad 8, compass 13.5, subtitle 15, intro 16, article heading 17, page heading 20, title 22, display 26, start title 28. Form Body/Button styles use **label 12.5**, Monospace uses body 12; expression editors explicitly use mono label 12.5. Control/form-button height is 28 points. These are egui logical points, not an established CSS physical-point specification. [palette metrics][metrics], [form scope][layout], [expression editor][fields]

## License and attribution

[ATTRIBUTION.md][attribution] explicitly identifies `solidcraft-95.json` as original work by **SolidCraft contributors**, licensed **MIT OR Apache-2.0**. Root [NOTICE][notice] and [Cargo.toml][cargo] agree; [MIT license][mit] identifies copyright **2026 SolidCraft contributors**. For copied/adapted theme data or renderer code, retain the upstream copyright and selected license's required notices; MIT expressly requires its copyright and permission notice in copies/substantial portions. [Apache license][apache] is the alternative. Preserve a source/revision attribution so provenance remains reviewable.

Bundled IBM Plex fonts are separate **SIL OFL 1.1** assets, copyright **2017 IBM Corp.**, reserved font name **Plex**. If redistributed, retain their OFL/copyright notices and comply with naming/redistribution conditions; the theme's software license does not replace the font licenses. [Sans OFL][sansofl], [Mono OFL][monoofl], [asset attribution][attribution]

## Complete explicit palette appendix

All entries below are transcribed programmatically from the pinned [theme JSON][theme]. Equal-valued roles share a line; arrays retain source order. This is theme data, not a Meridian token mapping.

### colors

- `#000080`: `accent`, `app_bar`, `app_bar_tab_active`, `box_window`, `chip`, `form_primary`, `icons.sheet_line`, `manipulator`, `preview_add`, `rubber_band`, `sel_profile`, `sel_profile_edge`, `sel_vertex`, `selected_bg`, `sketch`, `sketch_point_free`.
- `#c0c0c0`: `accent_soft`, `body`, `control_fill`, `cube_face`, `dialog_bg`, `dialog_body`, `dialog_footer`, `heading_bg`, `icon_fill`, `origin_point`, `panel`, `panel_header`, `subheading_bg`, `timeline`, `timeline_item`, `toolbar`.
- `#ffffff`: `agent_busy`, `app_bar_text`, `dimension`, `field`, `glyph_bg`, `hover_edge_halo`, `icons.highlight`, `icons.sheet_light`, `on_accent`, `selected_ink`, `sketch_halo`.
- `#008000`: `agent_ok`, `bend_up`, `box_crossing`, `form_success`, `preview_sketch`, `sketch_accent`, `sketch_locked`.
- `#ffffff33`: `app_bar_hover`, `app_bar_hover_button`.
- `#ffffff4d`: `app_bar_hover_strong`.
- `#ffffff1a`: `app_bar_hover_subtle`.
- `[#ffffff, #c0c0c0, #00ffff]`: `app_bar_icon`.
- `#808080`: `app_bar_separator`, `border`, `control_border`, `cube_border`, `dialog_border`, `dialog_rule`, `grid_major`, `icons.fold`, `text_dim`.
- `#ff0000`: `axis_x`, `error`, `icons.interference`, `interference`.
- `#00ff00`: `axis_y`.
- `#0000ff`: `axis_z`, `hover_profile_edge`, `sel_edge`.
- `#808000`: `bend_down`, `construction_geom`, `mesh_accent`, `mesh_fill`, `section_cap`, `sketch_centerline`, `sketch_construction`.
- `#000000`: `body_edge`, `cube_text`, `dialog_label`, `form_ink`, `hover_edge`, `icon`, `icons.floor`, `icons.stripe`, `sketch_fixed`, `sketch_point`, `tab_on_fill_dark`, `text`, `timeline_marker`.
- `#8080ff`: `body_selected`, `cube_hover`, `sel_edge_rim`, `sel_face`.
- `#ffff0046`: `construction_plane`.
- `[#008000, #0000ff, #ffff00, #800080]`: `continuity`.
- `#ffff00`: `dimension_driven`, `icons.folder`, `icons.plane`, `icons.warning`, `preview_new`, `warning`.
- `#800080`: `form_accent`, `form_fill`, `icons.agent`, `sketch_lost`, `sketch_projected`.
- `#404040`: `form_dim`.
- `#800000`: `form_error`, `glyph_edge`, `glyph_text`, `render_fill`, `render_ink`.
- `#ffffc0`: `form_error_fill`, `timeline_item_error`.
- `#bbb1bb`: `form_soft`.
- `#c0dcc0`: `form_success_fill`.
- `#7d007d`: `form_tab_ink`.
- `#40a0a0`: `grid`.
- `#dfdfdf`: `hover`.
- `#00008030`: `hover_profile`.
- `[#808080, #ff0000]`: `icons.access`.
- `[#ff0000, #008000, #0000ff]`: `icons.axes`.
- `[#008080, #808080, #ff0000]`: `icons.curvature`.
- `[#808080, #ffff00]`: `icons.draft`.
- `#ffffffa0`: `icons.glint`.
- `#00000096`: `icons.marker_halo`.
- `[#ff0000, #0000ff, #ffff00]`: `icons.paint`.
- `#00ffff`: `icons.sheet`.
- `#008080`: `icons.sheet_2`, `icons.sky`, `sheet_fill`, `viewport_bottom`, `viewport_top`.
- `[#ffffff, #c0c0c0, #808080]`: `logo`.
- `#4c4c00`: `mesh_ink`.
- `#bbbbb1`: `mesh_soft`.
- `#ffff005e`: `origin_plane`.
- `#808000c8`: `origin_plane_edge`.
- `#00008080`: `origin_plane_hover`.
- `#c0c0c0ff`: `overlay`.
- `#ff00006e`: `preview_cut`.
- `#ffff0033`: `profile_fill`.
- `#590905`: `render_accent`.
- `#bbb1b1`: `render_soft`.
- `#005151`: `sheet_ink`.
- `#b1bbbb`: `sheet_soft`.
- `#005400`: `sketch_ink`.
- `#b1bbb1`: `sketch_soft`.
- `#804000`: `surface_accent`, `surface_fill`.
- `#713800`: `surface_ink`.
- `#bbb6b1`: `surface_soft`.

### icon_palette

- `#000000`: `ink`, `line`.
- `#ffffff`: `passive-1`.
- `#c0c0c0`: `passive-2`.
- `#808080`: `passive-3`.
- `#696969`: `guide`.
- `[#c0c0ff, #0000ff, #000080]`: `solid`.
- `[#e0c0a0, #b07040, #804000]`: `surface`.
- `[#ffffc0, #c0c000, #808000]`: `mesh`, `construction`.
- `[#ffc0ff, #c000c0, #800080]`: `form`.
- `[#c0ffc0, #00c000, #008000]`: `sketch`.
- `[#ffc0c0, #ff0000, #800000]`: `constraint`.


[theme]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/assets/styles/ui/themes/solidcraft-95.json
[bevel]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/theme.rs#L363-L529
[layout]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/ui_kit/layout.rs#L29-L64
[visuals]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/theme.rs#L1621-L1652
[choice]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/ui_kit/choice.rs#L135-L195
[actions]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/ui_kit/actions.rs#L44-L120
[numberfocus]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/theme.rs#L723-L732
[fields]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/ui_kit/fields.rs
[fontdocs]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/docs/fonts.md
[fonts]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/crates/ui-egui/src/fonts.rs#L10-L35
[metrics]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/assets/styles/ui/palettes.rs#L50-L111
[attribution]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/ATTRIBUTION.md
[notice]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/NOTICE
[cargo]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/Cargo.toml
[mit]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/LICENSE-MIT
[apache]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/LICENSE-APACHE
[sansofl]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/assets/fonts/ibm-plex-sans/OFL.txt
[monoofl]: https://github.com/tangency-labs/solidcraft/blob/871014f955a76fd308ce156e68c93e6372906005/assets/fonts/ibm-plex-mono/OFL.txt
