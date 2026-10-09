// @vitest-environment jsdom
import { beforeAll, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { coverReadiness, libraryService } from './library';
import type { BackupFileSelection } from '../types';
vi.mock('@tauri-apps/api/core',()=>({invoke:vi.fn()}));
const reference=`meridian-cover:${'a'.repeat(64)}.jpg`;
beforeAll(()=>{Object.defineProperty(HTMLImageElement.prototype,'decode',{value:()=>Promise.resolve(),configurable:true,writable:true});});
beforeEach(()=>{libraryService.resetDemo();vi.mocked(invoke).mockReset();Object.defineProperty(window,'__TAURI_INTERNALS__',{value:{},configurable:true});});
afterEach(()=>{delete(window as unknown as Record<string,unknown>).__TAURI_INTERNALS__;});
it('shares managed IPC reads and retries failed resolution',async()=>{
  vi.mocked(invoke).mockRejectedValueOnce(new Error('missing')).mockResolvedValue('data:cover');
  await expect(libraryService.resolveCover(reference)).rejects.toThrow('missing');
  expect(await Promise.all([libraryService.resolveCover(reference),libraryService.resolveCover(reference)])).toEqual(['data:cover','data:cover']);
  expect(invoke).toHaveBeenCalledTimes(2);
});
it('preserves ready covers after failed restore and clears them after each successful restore API',async()=>{
  vi.mocked(invoke).mockResolvedValue('data:old');await coverReadiness.load(reference);
  const selection={path:'fixture.zip',digest:'fixture'} as BackupFileSelection;
  vi.mocked(invoke).mockRejectedValueOnce(new Error('restore failed'));
  await expect(libraryService.restoreBackupFile(selection)).rejects.toThrow('restore failed');
  expect(coverReadiness.peek(reference)).toBe('data:old');
  vi.mocked(invoke).mockResolvedValueOnce({}).mockResolvedValueOnce('data:new');
  await libraryService.restoreBackupFile(selection);expect(coverReadiness.peek(reference)).toBeUndefined();
  await coverReadiness.load(reference);expect(coverReadiness.peek(reference)).toBe('data:new');
  vi.mocked(invoke).mockResolvedValueOnce({});await libraryService.restoreBackup('{}');
  expect(coverReadiness.peek(reference)).toBeUndefined();
});
it('an old read failure cannot delete a new read cached after invalidation',async()=>{
  let fail!:(error:Error)=>void;
  vi.mocked(invoke).mockImplementationOnce(()=>new Promise((_,reject)=>{fail=reject})).mockResolvedValue('data:new');
  const old=libraryService.resolveCover(reference),rejected=expect(old).rejects.toThrow('old');
  libraryService.resetDemo();await libraryService.resolveCover(reference);fail(new Error('old'));await rejected;
  expect(await libraryService.resolveCover(reference)).toBe('data:new');expect(invoke).toHaveBeenCalledTimes(2);
});
it('retries native resolution after its deadline and ignores a late old read',async()=>{
  vi.useFakeTimers();
  try {
    let release!:(src:string)=>void;
    vi.mocked(invoke).mockImplementationOnce(()=>new Promise<string>(done=>{release=done})).mockResolvedValue('data:new');
    const pending=coverReadiness.load(reference),rejected=expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(15000);await rejected;
    await coverReadiness.load(reference);release('data:old');await vi.advanceTimersByTimeAsync(0);
    expect(coverReadiness.peek(reference)).toBe('data:new');expect(invoke).toHaveBeenCalledTimes(2);
  } finally {vi.useRealTimers();}
});
