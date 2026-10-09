// @vitest-environment jsdom
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { coverReadiness, libraryService } from '../services/library';
beforeAll(()=>{Object.defineProperty(HTMLImageElement.prototype,'decode',{value:()=>Promise.resolve(),configurable:true,writable:true});});
afterEach(()=>{cleanup();coverReadiness.clear();vi.restoreAllMocks();});
it('preloads next-tab covers and returns to All Books without another catalog refresh',async()=>{
  localStorage.clear();coverReadiness.clear();
  const list=vi.spyOn(libraryService,'listBooks'),read=vi.spyOn(libraryService,'resolveCover').mockImplementation(async r=>r);
  render(<App/>);await screen.findByRole('button',{name:'Open Dune'});
  const books=await list.mock.results[0].value;
  await waitFor(()=>expect(books.filter((b:{coverUrl?:string})=>b.coverUrl).every((b:{coverUrl:string})=>coverReadiness.peek(b.coverUrl))).toBe(true));
  const initialReads=read.mock.calls.length,initialLists=list.mock.calls.length;
  const sidebar=screen.getByRole('complementary',{name:'Sidebar'});
  fireEvent.click(within(sidebar).getByRole('button',{name:/Reading Now/}));
  fireEvent.click(within(sidebar).getByRole('button',{name:/All Collections/}));
  fireEvent.click(within(sidebar).getByRole('button',{name:/All Books/}));
  expect(screen.getByRole('button',{name:'Open Dune'})).toBeTruthy();
  expect(document.querySelector('.lib-skeleton')).toBeNull();
  expect(list).toHaveBeenCalledTimes(initialLists);expect(read).toHaveBeenCalledTimes(initialReads);
});
