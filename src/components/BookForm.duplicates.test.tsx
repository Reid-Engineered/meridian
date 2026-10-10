// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { BookForm } from './BookForm';
import { libraryService } from '../services/library';
import { EMPTY_BOOK, type BookDetail } from '../types';
const existing:BookDetail={...EMPTY_BOOK,id:12,title:'Dune',authors:['Frank Herbert'],isbn13:'9780441172719',dateAdded:'2026-10-10'};
beforeEach(()=>{vi.spyOn(libraryService,'findDuplicates').mockResolvedValue([{book:existing,reason:'isbn'}]);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function setup(book?:BookDetail) {
  const save=vi.fn().mockResolvedValue(undefined),open=vi.fn(),merged=vi.fn().mockResolvedValue(undefined),close=vi.fn();
  render(<BookForm book={book} collections={[]} onSave={save} onClose={close} onOpenExisting={open} onMerged={merged}/>);
  if(!book)fireEvent.change(screen.getByRole('textbox',{name:'Title *'}),{target:{value:'Dune'}});
  return {save,open,merged,close};
}
async function review(){fireEvent.click(screen.getByRole('button',{name:'Add book'}));return screen.findByRole('dialog',{name:'This book may already be in your library'});}
it('checks without saving, allows cancellation, and opens an existing book',async()=>{
  const {save,open}=setup();let dialog=await review();expect(save).not.toHaveBeenCalled();
  expect(within(dialog).queryByRole('button',{name:'Keep as separate edition'})).toBeNull();
  fireEvent.click(within(dialog).getByRole('button',{name:'Return to form'}));expect(screen.getByRole('textbox',{name:'Title *'}).getAttribute('value')).toBe('Dune');
  dialog=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Open existing'}));expect(open).toHaveBeenCalledWith(existing);expect(save).not.toHaveBeenCalled();
});
it('explicitly adds an independent copy through the selected existing entry',async()=>{
  const {save}=setup();const dialog=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Add another copy'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({title:'Dune'}),12));
});
it('allows separate editions on title/author matches and rechecks changed drafts',async()=>{
  vi.mocked(libraryService.findDuplicates).mockResolvedValue([{book:existing,reason:'titleAuthor'}]);
  const {save}=setup();let dialog=await review();fireEvent.click(within(dialog).getByRole('button',{name:'Return to form'}));
  fireEvent.change(screen.getByRole('textbox',{name:'Title *'}),{target:{value:'Dune revised'}});dialog=await review();
  expect(libraryService.findDuplicates).toHaveBeenLastCalledWith(expect.objectContaining({title:'Dune revised'}),undefined);
  fireEvent.click(within(dialog).getByRole('button',{name:'Keep as separate edition'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({title:'Dune revised'})));
});
it('fails closed on a lookup error and supports retry',async()=>{
  vi.mocked(libraryService.findDuplicates).mockRejectedValueOnce(new Error('Check unavailable')).mockResolvedValueOnce([]);
  const {save}=setup();fireEvent.click(screen.getByRole('button',{name:'Add book'}));expect((await screen.findByRole('alert')).textContent).toContain('Check unavailable');expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Add book'}));await waitFor(()=>expect(save).toHaveBeenCalledTimes(1));
});
it('requires merge review and confirmation, keeps the chosen entry and permits failure retry',async()=>{
  const keeper={...existing,id:3};const mergedBook={...keeper,notes:'Both notes'};
  const merge=vi.spyOn(libraryService,'mergeBookCopies').mockRejectedValueOnce(new Error('Recovery unavailable')).mockResolvedValueOnce(mergedBook);
  const {save,merged}=setup(keeper);fireEvent.click(screen.getByRole('button',{name:'Save changes'}));
  const dialog=await screen.findByRole('dialog',{name:'This book may already be in your library'});
  expect(libraryService.findDuplicates).toHaveBeenCalledWith(expect.anything(),3);
  fireEvent.click(within(dialog).getByRole('button',{name:'Review merge'}));expect(merge).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirm merge'}));expect((await screen.findByRole('alert')).textContent).toContain('Recovery unavailable');expect(merged).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirm merge'}));await waitFor(()=>expect(merged).toHaveBeenCalledWith(mergedBook));expect(merge).toHaveBeenLastCalledWith(3,12);expect(save).not.toHaveBeenCalled();
});
it('blocks repeated actions and Escape while a copy is being saved',async()=>{
  let finish!:()=>void;const {save}=setup();save.mockImplementation(()=>new Promise<void>(resolve=>{finish=resolve}));
  const dialog=await review();const add=within(dialog).getByRole('button',{name:'Add another copy'});
  fireEvent.click(add);fireEvent.click(add);fireEvent.keyDown(document,{key:'Escape'});expect(save).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('dialog',{name:'This book may already be in your library'})).toBeTruthy();finish();await waitFor(()=>expect(add.hasAttribute('disabled')).toBe(false));
});
