// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BookForm } from './BookForm';
import { coverReadiness, libraryService } from '../services/library';
import type { BookDetail } from '../types';

const reference=`meridian-cover:${'a'.repeat(64)}.jpg`;
const imported={reference,bytes:60000,width:400,height:600};
beforeEach(()=>{coverReadiness.clear();Object.defineProperty(HTMLImageElement.prototype,'decode',{value:()=>Promise.resolve(),configurable:true});Object.defineProperty(window,'__TAURI_INTERNALS__',{value:{},configurable:true});vi.spyOn(libraryService,'resolveCover').mockImplementation(async r=>r.startsWith('meridian-cover:')?'data:image/jpeg;base64,fixture':r);});
afterEach(()=>{cleanup();vi.restoreAllMocks();delete(window as unknown as Record<string,unknown>).__TAURI_INTERNALS__;});
it('imports, previews and saves a portable reference, then allows removing the cover',async()=>{
  vi.spyOn(libraryService,'chooseCover').mockResolvedValue(imported);const save=vi.fn().mockResolvedValue(undefined);
  render(<BookForm collections={[]} onSave={save} onClose={()=>{}}/>);
  fireEvent.change(screen.getByRole('textbox',{name:'Title *'}),{target:{value:'Owned image'}});
  fireEvent.click(screen.getByRole('button',{name:'Choose cover'}));
  await screen.findByText('Stored in your library. Included in portable backups.');
  await waitFor(()=>expect(screen.getByRole('img',{name:'Cover of Owned image'}).getAttribute('src')).toContain('data:image/jpeg'));
  fireEvent.click(screen.getByRole('button',{name:'Add book'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({coverUrl:reference})));
});
it('failed or cancelled replacement keeps the original cover and permits retry',async()=>{
  const choose=vi.spyOn(libraryService,'chooseCover').mockRejectedValueOnce('Invalid image').mockResolvedValueOnce(null).mockResolvedValueOnce(imported);
  const book={id:1,dateAdded:'2026-10-08',title:'Original',authors:[],tags:[],collectionIds:[],format:'Paperback',status:'Unread',coverUrl:'https://example.com/old.jpg'} as BookDetail;
  render(<BookForm book={book} collections={[]} onSave={vi.fn()} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Replace cover'}));expect((await screen.findByRole('alert')).textContent).toContain('Invalid image');
  expect(screen.getByRole('img',{name:'Cover of Original'}).getAttribute('src')).toBe(book.coverUrl);
  fireEvent.click(screen.getByRole('button',{name:'Replace cover'}));await waitFor(()=>expect(choose).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Replace cover'}).hasAttribute('disabled')).toBe(false));
  expect(screen.getByRole('img',{name:'Cover of Original'}).getAttribute('src')).toBe(book.coverUrl);
  fireEvent.click(screen.getByRole('button',{name:'Replace cover'}));await screen.findByText('Stored in your library. Included in portable backups.');
});
it('removing a cover changes the draft only and saves the removal through the book operation',async()=>{
  const save=vi.fn().mockResolvedValue(undefined);
  const book={id:1,dateAdded:'2026-10-08',title:'Original',authors:[],tags:[],collectionIds:[],format:'Paperback',status:'Unread',coverUrl:reference} as BookDetail;
  render(<BookForm book={book} collections={[]} onSave={save} onClose={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Remove cover'}));expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Save changes'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({coverUrl:''})));
});
