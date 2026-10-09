# App icon sources

Meridian's icon ("Longitude") is a globe drawn in meridian lines, with one section lifting free like a page being turned. Every file in `src-tauri/icons` is generated from the two SVGs here; edit these, never the generated PNG, ICO or ICNS files.

| File | Use |
| --- | --- |
| `meridian-icon.svg` | Master artwork on the macOS icon grid: 1024 px canvas, 824 px rounded body, baked-in drop shadow. Used for 48 px and up. |
| `meridian-icon-small.svg` | Simplified artwork for 16, 24 and 32 px: no inner meridian, heavier strokes, a filled half instead of the lifted page. |
| `public/favicon.svg` | The small artwork cropped to the body, without shadow, for the webview tab. Kept in sync by hand. |

## Regenerating

```sh
npm run icons
```

`scripts/generate-icons.mjs` runs `tauri icon` on the master, then swaps the small artwork into `32x32.png`, the 16/24/32 px entries of `icon.ico`, and the 16, 32 and 16@2x entries of `icon.icns` (as PNG chunks). Larger sizes keep the master. Commit the regenerated files with the source change.

## Colours

| Role | Value |
| --- | --- |
| Ground (top → bottom) | `#C3703A` → `#8A4520`, Meridian sienna |
| Lines | `#FBF7F2` |
| Page | `#F3C9A2` (`#EEB382` in the small artwork) |

## Known limits

- Windows and Linux use the same padded macOS-grid artwork, so the body sits slightly smaller than full-bleed icons on those platforms.
- iOS and Android files are regenerated too, but Meridian does not ship on mobile; they are not tuned (iOS fills the transparent margin with white).
- Dark and tinted macOS variants exist only as design exploration; they are not wired in.
