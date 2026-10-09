import { Check, Database, Download, FolderOpen, Info, Moon, RotateCcw, Sun, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { libraryService } from "../services/library";
import type { AppInfo, BackupSummary } from "../types";

export function SettingsPage({dark,onTheme,info,onExport,onReset,onRestored}:{dark:boolean;onTheme:(d:boolean)=>void;info:AppInfo|null;onExport:()=>Promise<void>;onReset:()=>void;onRestored:()=>Promise<void>}){
  const native='__TAURI_INTERNALS__' in window;
  const fileInput=useRef<HTMLInputElement>(null);
  const [pending,setPending]=useState<{json:string;name:string;summary:BackupSummary}|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const failure=(e:unknown)=>e instanceof Error?e.message:String(e);
  const choose=async(file:File|undefined)=>{
    if(!file)return;
    setError('');setMessage('');setBusy(true);
    try {
      if(file.size>64*1024*1024)throw new Error('Backup exceeds the supported 64 MiB limit.');
      const json=await file.text(),summary=await libraryService.inspectBackup(json);
      setPending({json,name:file.name,summary});
    }catch(e){setError(failure(e))}finally{setBusy(false)}
  };
  const restore=async()=>{
    if(!pending||busy)return;
    setBusy(true);setError('');
    try {
      const result=await libraryService.restoreBackup(pending.json);
      setBusy(false);setPending(null);setMessage(`Restored ${result.summary.books} books. Previous library saved at ${result.recoveryPath}`);
      try {await onRestored()}catch{setError('Restore succeeded. Reload Meridian to refresh the displayed library.')}
    }catch(e){setPending(null);setError(failure(e))}finally{setBusy(false)}
  };
  const exportBackup=async()=>{
    setBusy(true);setError('');setMessage('');
    try {if(native){if(await libraryService.saveBackup())setMessage('Database backup saved.')}else{await onExport()}}
    catch(e){setError(failure(e))}finally{setBusy(false)}
  };
  return <div className="page settings-page"><section className="settings-column">
    <article className="settings-card"><header><span><Sun size={18}/></span><div><h3>Appearance</h3><p>Choose how Meridian looks on this device.</p></div></header><div className="setting-row"><div><strong>Theme</strong><small>A quieter light palette or a deep reading-room dark mode.</small></div><div className="theme-choice"><button className={!dark?"active":""} onClick={()=>onTheme(false)}><Sun size={16}/>Light{!dark&&<Check size={14}/>}</button><button className={dark?"active":""} onClick={()=>onTheme(true)}><Moon size={16}/>Dark{dark&&<Check size={14}/>}</button></div></div></article>
    <article className="settings-card"><header><span><Database size={18}/></span><div><h3>Library data</h3><p>Your catalog stays on this computer.</p></div></header><div className="path-card"><FolderOpen size={17}/><div><small>Database</small><code>{info?.databasePath||"Loading…"}</code></div></div><div className="path-card"><FolderOpen size={17}/><div><small>Cover storage</small><code>{info?.coversPath||"Loading…"}</code></div></div></article>
    <article className="settings-card"><header><span><Download size={18}/></span><div><h3>Backup & restore</h3><p>{native?'Keep a copy of your complete catalog and reading history.':'Browser preview catalog export. Database backup and restore require the desktop app.'}</p></div></header><div className="setting-row"><div><strong>{native?'Save database backup':'Export preview catalog'}</strong><small>{native?'Preserves all database records. Cover image files are separate; copy them with your backup.':'Includes current book details and collections only.'}</small></div><button className="button secondary" disabled={busy} onClick={exportBackup}><Download size={16}/>{native?'Save backup':'Export catalog'}</button></div><div className="setting-row"><div><strong>Restore database backup</strong><small>Replaces this library after validation and saves a recovery copy first. Accepts version-2 desktop backups.</small></div><button className="button secondary" disabled={!native||busy} onClick={()=>fileInput.current?.click()}><Upload size={16}/>Choose file</button><input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void choose(file)}}/></div>{busy&&!pending&&<p role="status">Checking or saving backup…</p>}{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p role="status" style={{overflowWrap:'anywhere'}}>{message}</p>}</article>
    <article className="settings-card"><header><span><Info size={18}/></span><div><h3>About Meridian</h3><p>A private home for the books that shape you.</p></div></header><div className="setting-row"><div><strong>Application version</strong><small>Meridian Desktop</small></div><code>{info?.version||"0.1.0"}</code></div>{!('__TAURI_INTERNALS__' in window)&&<div className="setting-row"><div><strong>Reset preview data</strong><small>Restore the sample library in this browser preview.</small></div><button className="button danger-quiet" onClick={onReset}><RotateCcw size={16}/>Reset</button></div>}</article>
  </section>{pending&&<ConfirmDialog title="Replace this library?" body={`${pending.name} contains ${pending.summary.books} books, ${pending.summary.collections} collections and ${pending.summary.readingRecords} reading records. This replaces the current catalog. A recovery backup is saved first. Cover image files are not included.`} confirm="Replace library" busy={busy} onClose={()=>setPending(null)} onConfirm={()=>void restore()}/>}</div>;
}
