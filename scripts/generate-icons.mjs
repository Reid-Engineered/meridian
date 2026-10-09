// Regenerates every app icon from the two sources in src-tauri/icons/source.
//
//   meridian-icon.svg        master artwork (macOS icon grid, 1024 canvas)
//   meridian-icon-small.svg  simplified artwork for 16, 24 and 32 px
//
// Usage: npm run icons
//
// `tauri icon` renders the full set from the master. The small artwork then
// replaces the 16/24/32 px images: 32x32.png, those entries in icon.ico, and
// the 16, 32 and 16@2x entries in icon.icns. Larger sizes keep the master.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const icons = join(root, 'src-tauri', 'icons');
const master = join(icons, 'source', 'meridian-icon.svg');
const small = join(icons, 'source', 'meridian-icon-small.svg');
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function tauriIcon(args) {
  const result = spawnSync(npx, ['tauri', 'icon', ...args], {
    cwd: root, stdio: 'inherit', shell: process.platform === 'win32'
  });
  if (result.status !== 0) throw new Error(`tauri icon ${args.join(' ')} failed (exit ${result.status})`);
}

// ICO: keep each entry's header fields, swap in a PNG for the small sizes.
function patchIco(file, replacements) {
  const data = readFileSync(file);
  const count = data.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const at = 6 + i * 16;
    const width = data[at] || 256;
    const size = data.readUInt32LE(at + 8);
    const offset = data.readUInt32LE(at + 12);
    const image = replacements.get(width) ?? data.subarray(offset, offset + size);
    entries.push({ head: Buffer.from(data.subarray(at, at + 8)), image });
  }
  const header = Buffer.alloc(6 + count * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = header.length;
  entries.forEach((entry, i) => {
    const at = 6 + i * 16;
    entry.head.copy(header, at);
    header.writeUInt32LE(entry.image.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += entry.image.length;
  });
  const missing = [...replacements.keys()].filter(size => !entries.some(e => (e.head[0] || 256) === size));
  if (missing.length) throw new Error(`icon.ico has no ${missing.join(', ')} px entries to replace`);
  writeFileSync(file, Buffer.concat([header, ...entries.map(e => e.image)]));
}

// ICNS: drop the legacy 16/32 px bitmaps (is32/s8mk, il32/l8mk) and write the
// small artwork as PNG chunks instead (icp4 = 16, icp5 = 32, ic11 = 16@2x).
function patchIcns(file, png16, png32) {
  const data = readFileSync(file);
  if (data.toString('ascii', 0, 4) !== 'icns') throw new Error('icon.icns is not an ICNS file');
  const drop = new Set(['is32', 's8mk', 'il32', 'l8mk', 'icp4', 'icp5', 'ic11', 'TOC ']);
  const chunks = [];
  for (let at = 8; at < data.length;) {
    const type = data.toString('ascii', at, at + 4);
    const length = data.readUInt32BE(at + 4);
    if (length < 8) throw new Error(`icon.icns has a malformed ${type} chunk`);
    if (!drop.has(type)) chunks.push(data.subarray(at, at + length));
    at += length;
  }
  const chunk = (type, png) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, 'ascii');
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  };
  chunks.unshift(chunk('icp4', png16), chunk('icp5', png32), chunk('ic11', png32));
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(8);
  head.write('icns', 0, 'ascii');
  head.writeUInt32BE(body.length + 8, 4);
  writeFileSync(file, Buffer.concat([head, body]));
}

tauriIcon([master, '-o', icons]);

const scratch = mkdtempSync(join(tmpdir(), 'meridian-icons-'));
try {
  tauriIcon([small, '-o', scratch, '-p', '16', '-p', '24', '-p', '32']);
  const png = size => readFileSync(join(scratch, `${size}x${size}.png`));
  copyFileSync(join(scratch, '32x32.png'), join(icons, '32x32.png'));
  patchIco(join(icons, 'icon.ico'), new Map([[16, png(16)], [24, png(24)], [32, png(32)]]));
  patchIcns(join(icons, 'icon.icns'), png(16), png(32));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log('\nIcons regenerated from src-tauri/icons/source.');
