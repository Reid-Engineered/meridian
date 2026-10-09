import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const quick = process.argv.includes('--quick');
const unknown = process.argv.slice(2).filter(arg => arg !== '--quick');
if (unknown.length) throw new Error(`Unknown verification arguments: ${unknown.join(' ')}`);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const checks = [
  ['Frontend tests', npm, ['test']],
  ['Frontend build', npm, ['run', 'build']],
  ['Rust storage and repository tests', 'cargo', ['test', '--manifest-path', 'src-tauri/core-tests/Cargo.toml']],
  ['Representative database fixtures', 'cargo', ['run', '--manifest-path', 'src-tauri/core-tests/Cargo.toml', '--example', 'fixtures', '--', 'fixtures/generated']],
  ...(!quick ? [['Tauri release build and bundles', npm, ['run', 'build:desktop']]] : [])
];
const results = [];
for (const [name, command, args] of checks) {
  console.log(`\n${name}`);
  const start = Date.now();
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && command === npm });
  results.push({ name, passed: result.status === 0, exitCode: result.status, error: result.error?.message, seconds: (Date.now() - start) / 1000 });
}
mkdirSync(new URL('../verification/', import.meta.url), { recursive: true });
writeFileSync(new URL('../verification/latest.json', import.meta.url), JSON.stringify({
  recordedAt: new Date().toISOString(), mode: quick ? 'quick' : 'full', toolchain: process.env.RUSTUP_TOOLCHAIN ?? 'default', results
}, null, 2) + '\n');
console.table(results);
process.exitCode = results.every(result => result.passed) ? 0 : 1;
