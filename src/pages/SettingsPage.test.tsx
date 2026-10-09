// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { libraryService } from '../services/library';

beforeEach(()=>{Object.defineProperty(window,'__TAURI_INTERNALS__',{value:{},configurable:true});});
afterEach(()=>{cleanup();vi.restoreAllMocks();delete (window as unknown as Record<string,unknown>).__TAURI_INTERNALS__;});
const summary={books:12,collections:3,readingRecords:18};
function setup(){const refresh=vi.fn().mockResolvedValue(undefined);const view=render(<SettingsPage dark={false} onTheme={()=>{}} info={null} onExport={vi.fn()} onReset={()=>{}} onRestored={refresh}/>);return {...view,refresh};}
function choose(container:HTMLElement){const file=new File(['snapshot'],'library.json',{type:'application/json'});Object.defineProperty(file,'text',{value:()=>Promise.resolve('snapshot')});fireEvent.change(container.querySelector('input[type=file]')!,{target:{files:[file]}});}
it('validates and summarizes before replacement, with cancellation preserving the library',async()=>{
  vi.spyOn(libraryService,'inspectBackup').mockResolvedValue(summary);const restore=vi.spyOn(libraryService,'restoreBackup');
  const view=setup();choose(view.container);
  const dialog=await screen.findByRole('alertdialog');expect(dialog.textContent).toContain('12 books, 3 collections and 18 reading records');
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Cancel'}));
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(restore).not.toHaveBeenCalled();expect(view.refresh).not.toHaveBeenCalled();
});
it('rejects invalid backup before confirmation and permits choosing a corrected file',async()=>{
  const inspect=vi.spyOn(libraryService,'inspectBackup').mockRejectedValueOnce('Unsupported backup format').mockResolvedValueOnce(summary);
  const restore=vi.spyOn(libraryService,'restoreBackup');const view=setup();choose(view.container);
  expect((await screen.findByRole('alert')).textContent).toContain('Unsupported backup format');expect(screen.queryByRole('alertdialog')).toBeNull();expect(restore).not.toHaveBeenCalled();
  choose(view.container);await screen.findByRole('alertdialog');expect(inspect).toHaveBeenCalledTimes(2);
});
it('blocks duplicate submission and Escape while restoring, then shows recovery location and refreshes',async()=>{
  vi.spyOn(libraryService,'inspectBackup').mockResolvedValue(summary);
  let finish!:(value:{summary:typeof summary;recoveryPath:string})=>void;
  const restore=vi.spyOn(libraryService,'restoreBackup').mockImplementation(()=>new Promise(resolve=>{finish=resolve}));
  const view=setup();choose(view.container);await screen.findByRole('alertdialog');
  fireEvent.click(screen.getByRole('button',{name:'Replace library'}));fireEvent.click(screen.getByRole('button',{name:'Restoring…'}));
  fireEvent.keyDown(document.activeElement!,{key:'Escape'});expect(screen.getByRole('alertdialog')).toBeTruthy();expect(restore).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(document.activeElement!,{key:'Tab'});expect(document.activeElement).toBe(screen.getByRole('alertdialog'));
  finish({summary,recoveryPath:'C:/isolated/backups/before-restore.json'});
  await waitFor(()=>expect(view.refresh).toHaveBeenCalledTimes(1));expect((await screen.findByRole('status')).textContent).toContain('before-restore.json');
});
it('shows recoverable restore failures without claiming success or refreshing',async()=>{
  vi.spyOn(libraryService,'inspectBackup').mockResolvedValue(summary);vi.spyOn(libraryService,'restoreBackup').mockRejectedValue('Recovery file could not be saved');
  const view=setup();choose(view.container);await screen.findByRole('alertdialog');fireEvent.click(screen.getByRole('button',{name:'Replace library'}));
  expect((await screen.findByRole('alert')).textContent).toContain('Recovery file could not be saved');expect(view.refresh).not.toHaveBeenCalled();expect(screen.queryByRole('alertdialog')).toBeNull();
});
