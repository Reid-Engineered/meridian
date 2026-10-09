import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

if (process.platform !== 'win32') throw new Error('This installer smoke check targets Windows.');
const root = fileURLToPath(new URL('../', import.meta.url));
const run = join(root, 'verification', 'native-smoke', randomUUID());
const data = join(run, 'data'), install = join(run, 'installed');
mkdirSync(data, {recursive:true});
writeFileSync(join(data, '.meridian-smoke'), 'Meridian isolated smoke test\n');
const report = {run, passed:false, stages:[], uninstallPassed:false};
const target = resolve(root, 'src-tauri', process.env.CARGO_TARGET_DIR ?? 'target');
const installer = join(target, 'release', 'bundle', 'nsis', 'Meridian Smoke Test_0.1.0_x64-setup.exe');
const execute = (file, args, verbatim=false, timeout=120_000) => {
  const result = spawnSync(file, args, {cwd:root, stdio:'inherit', timeout, windowsVerbatimArguments:verbatim});
  if (result.error || result.status !== 0) throw new Error(`${file}: ${result.error?.message ?? `exit ${result.status}`}`);
};
try {
  if (!existsSync(installer)) throw new Error('Build the smoke-test NSIS installer first.');
  execute(installer, ['/S', `/D=${install}`],true);
  const executable = join(install,'meridian.exe');
  if (!existsSync(executable)) throw new Error('Installer did not create the native executable.');
  for (const stage of ['initial','reopen','scaled','cleanup']) {
    execute(executable,['--smoke-test-dir', data,'--smoke-test-stage',stage]);
    const result=JSON.parse(readFileSync(join(data,`${stage}.json`),'utf8'));
    report.stages.push(result);
    if (!result.passed) throw new Error(`${stage}: ${result.error}`);
    console.log(`${stage}: ${result.checks.length} native WebView/IPC checks passed`);
  }
  report.passed=true;
} catch (error) {
  report.error=String(error);
} finally {
  const uninstaller=join(install,'uninstall.exe');
  if (existsSync(uninstaller)) {
    try { execute(uninstaller,['/S',`_?=${install}`],true); report.uninstallPassed=!existsSync(join(install,'meridian.exe')); }
    catch(error) { report.uninstallError=String(error); }
  }
  report.passed=report.passed && report.uninstallPassed;
  writeFileSync(join(run,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Evidence: ${join(run,'report.json')}`);
  if (!report.passed) { console.error(report.error ?? report.uninstallError ?? 'Uninstall failed'); process.exitCode=1; }
}
