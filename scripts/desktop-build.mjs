import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const smoke=process.argv.includes('--smoke');
if(process.argv.slice(2).some(arg=>arg!=='--smoke')) throw new Error('Only --smoke is supported.');
const rust=spawnSync('rustc',['-vV'],{encoding:'utf8'});
if(rust.status!==0) throw new Error(rust.error?.message ?? 'Could not inspect the Rust toolchain.');
const host=rust.stdout.match(/^host: (.+)$/m)?.[1];
let config=smoke?JSON.parse(readFileSync(join(root,'scripts','smoke-config.json'),'utf8')):{};
if(process.platform==='win32' && host?.endsWith('windows-gnu')) {
  // Resolve the loader from the locked dependency before Tauri validates resources.
  const metadata=spawnSync('cargo',['metadata','--locked','--format-version','1','--manifest-path','src-tauri/Cargo.toml'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
  if(metadata.status!==0) throw new Error(metadata.stderr || 'Could not resolve WebView2 dependency.');
  const dependency=JSON.parse(metadata.stdout).packages.find(item=>item.name==='webview2-com-sys');
  if(!dependency) throw new Error('WebView2 dependency is missing.');
  const arch=host.startsWith('x86_64-')?'x64':host.startsWith('i686-')?'x86':host.startsWith('aarch64-')?'arm64':null;
  if(!arch) throw new Error(`Unsupported WebView2 architecture: ${host}`);
  const target=resolve(root,'src-tauri',process.env.CARGO_TARGET_DIR ?? 'target');
  const loader=join(target,...(process.env.CARGO_BUILD_TARGET?[process.env.CARGO_BUILD_TARGET]:[]),'release','WebView2Loader.dll');
  mkdirSync(dirname(loader),{recursive:true});
  copyFileSync(join(dirname(dependency.manifest_path),arch,'WebView2Loader.dll'),loader);
  config.bundle={...config.bundle,resources:{[relative(join(root,'src-tauri'),loader).replaceAll('\\','/')]: 'WebView2Loader.dll'}};
}
const args=['run','tauri','--','build',...(smoke?['--features','smoke-test']:[]),
  ...(Object.keys(config).length?['--config',JSON.stringify(config)]:[])];
if(!process.env.npm_execpath) throw new Error('Run through npm run build:desktop.');
const result=spawnSync(process.execPath,[process.env.npm_execpath,...args],{cwd:root,stdio:'inherit'});
if(result.status===0 && process.platform==='win32' && host?.includes('windows')) {
  const target=resolve(root,'src-tauri',process.env.CARGO_TARGET_DIR ?? 'target');
  const executable=join(target,...(process.env.CARGO_BUILD_TARGET?[process.env.CARGO_BUILD_TARGET]:[]),'release','meridian.exe');
  const binary=readFileSync(executable);
  const pe=binary.readUInt32LE(0x3c);
  if(binary.toString('ascii',pe,pe+4)!=='PE\0\0' || binary.readUInt16LE(pe+24+68)!==2) {
    throw new Error('Windows release must use the GUI subsystem so launching Meridian does not open a console.');
  }
  console.log('Verified Windows GUI subsystem: no launch console.');
}
process.exitCode=result.status ?? 1;
