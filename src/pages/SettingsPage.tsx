import { Check, Database, Download, FolderOpen, Info, Monitor, Moon, RotateCcw, Sun, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { libraryService } from "../services/library";
import type { AppInfo, BackupFileSelection, CoverStorage } from "../types";
import type { ThemePreference } from "../theme";

const themes:{value:ThemePreference;label:string;icon:typeof Sun}[]=[{value:"light",label:"Light",icon:Sun},{value:"dark",label:"Dark",icon:Moon},{value:"system",label:"Automatic",icon:Monitor}];

export function SettingsPage({theme,onTheme,info,onExport,onReset,onRestored}:{theme:ThemePreference;onTheme:(t:ThemePreference)=>void;info:AppInfo|null;onExport:()=>Promise<void>;onReset:()=>void;onRestored:()=>Promise<void>}){
  const native='__TAURI_INTERNALS__' in window;
  const [storage,setStorage]=useState<CoverStorage|null>(null);
  const refreshStorage=()=>libraryService.getCoverStorage().then(setStorage,()=>setStorage(null));
  useEffect(()=>{void refreshStorage()},[]);
  const [pending,setPending]=useState<BackupFileSelection|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const failure=(e:unknown)=>e instanceof Error?e.message:String(e);
  const choose=async()=>{
    setError('');setMessage('');setBusy(true);
    try {setPending(await libraryService.chooseBackup())}
    catch(e){setError(failure(e))}finally{setBusy(false)}
  };
  const restore=async()=>{
    if(!pending||busy)return;
    setBusy(true);setError('');
    try {
      const result=await libraryService.restoreBackupFile(pending);
      setBusy(false);setPending(null);setMessage(`Restored ${result.summary.books} books. Previous library saved at ${result.recoveryPath}`);
      void refreshStorage();try {await onRestored()}catch{setError('Restore succeeded. Reload Meridian to refresh the displayed library.')}
    }catch(e){setPending(null);setError(failure(e))}finally{setBusy(false)}
  };
  const exportBackup=async()=>{
    setBusy(true);setError('');setMessage('');
    try {if(native){if(await libraryService.saveBackup())setMessage('Portable backup saved.')}else{await onExport()}}
    catch(e){setError(failure(e))}finally{setBusy(false)}
  };
  return <div className="page settings-page"><section className="settings-column">
    <article className="settings-card"><header><span><Sun size={18}/></span><div><h3>Appearance</h3><p>Choose how Meridian looks on this device.</p></div></header><div className="setting-row"><div><strong>Theme</strong><small>Light, dark, or match your system’s appearance.</small></div><div className="theme-choice" role="group" aria-label="Theme">{themes.map(({value,label,icon:Icon})=><button key={value} className={theme===value?"active":""} aria-pressed={theme===value} onClick={()=>onTheme(value)}><Icon size={16}/>{label}{theme===value&&<Check size={14}/>}</button>)}</div></div></article>
    <article className="settings-card"><header><span><Database size={18}/></span><div><h3>Library data</h3><p>Your catalog stays on this computer.</p></div></header><div className="path-card"><FolderOpen size={17}/><div><small>Database</small><code>{info?.databasePath||"Loading…"}</code></div></div><div className="path-card"><FolderOpen size={17}/><div><small>Cover storage</small><code>{info?.coversPath||"Loading…"}</code></div></div></article>
    {native&&<article className="settings-card"><header><span><FolderOpen size={18}/></span><div><h3>Cover storage</h3><p>Imported images are resized and identical copies are shared.</p></div></header><div className="setting-row"><div><strong>{storage?`${storage.files} stored cover images`:'Reading cover storage…'}</strong><small>{storage?`${(storage.bytes/(1024*1024)).toFixed(2)} MiB on disk. Includes unused images retained for recovery.`:'Storage usage is currently unavailable.'}</small></div><button className="button secondary" disabled={busy} onClick={()=>void refreshStorage()}>Refresh</button></div></article>}
    <article className="settings-card"><header><span><Download size={18}/></span><div><h3>Backup & restore</h3><p>{native?'Keep a copy of your complete catalog and reading history.':'Browser preview catalog export. Database backup and restore require the desktop app.'}</p></div></header><div className="setting-row"><div><strong>{native?'Save database backup':'Export preview catalog'}</strong><small>{native?'Includes every catalog record and all locally imported covers in one ZIP. Online cover URLs remain links.':'Includes current book details and collections only.'}</small></div><button className="button secondary" disabled={busy} onClick={exportBackup}><Download size={16}/>{native?'Save backup':'Export catalog'}</button></div><div className="setting-row"><div><strong>Restore database backup</strong><small>Replaces this library after validation and saves a recovery copy first. Accepts portable ZIP backups and version-2 catalog JSON.</small></div><button className="button secondary" disabled={!native||busy} onClick={choose}><Upload size={16}/>Choose file</button></div>{busy&&!pending&&<p role="status">Checking or saving backup…</p>}{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p role="status" style={{overflowWrap:'anywhere'}}>{message}</p>}</article>
    <article className="settings-card"><header><span><Info size={18}/></span><div><h3>About Meridian</h3><p>A private home for the books that shape you.</p></div></header><div className="setting-row"><div><strong>Application version</strong><small>Meridian Desktop</small></div><code>{info?.version||"0.1.0"}</code></div>{!('__TAURI_INTERNALS__' in window)&&<div className="setting-row"><div><strong>Reset preview data</strong><small>Restore the sample library in this browser preview.</small></div><button className="button danger-quiet" onClick={onReset}><RotateCcw size={16}/>Reset</button></div>}</article>
  </section>{pending&&<ConfirmDialog title="Replace this library?" body={`${pending.name} contains ${pending.summary.books} books, ${pending.summary.collections} collections and ${pending.summary.readingRecords} reading records. This replaces the current catalog. A recovery backup is saved first. Includes ${pending.coverFiles} managed cover images. ${pending.externalCovers ? `${pending.externalCovers} online or external cover references remain links.` : ""}`} confirm="Replace library" busy={busy} onClose={()=>setPending(null)} onConfirm={()=>void restore()}/>}</div>;
}
