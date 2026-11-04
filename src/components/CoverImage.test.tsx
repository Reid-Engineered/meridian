// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { CoverImage } from './CoverImage';
import { coverReadiness, libraryService } from '../services/library';
beforeAll(()=>{Object.defineProperty(HTMLImageElement.prototype,'decode',{value:()=>Promise.resolve(),configurable:true,writable:true});});
beforeEach(()=>{
  coverReadiness.clear();vi.spyOn(HTMLImageElement.prototype,'decode').mockResolvedValue(undefined);
  vi.spyOn(libraryService,'resolveCover').mockImplementation(async r=>`data:image/jpeg;base64,${r}`);
});
afterEach(()=>{cleanup();coverReadiness.clear();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('renders a preloaded cover on the first render after every tab remount',async()=>{
  await coverReadiness.load('owned');
  const first=render(<CoverImage reference="owned" alt="Cover"/>);
  expect(screen.getByRole('img',{name:'Cover'}).getAttribute('src')).toContain('owned');first.unmount();
  render(<CoverImage reference="owned" alt="Cover"/>);
  expect(screen.queryByLabelText('Loading cover')).toBeNull();expect(screen.getByRole('img',{name:'Cover'}).getAttribute('loading')).toBe('eager');
  expect(libraryService.resolveCover).toHaveBeenCalledTimes(1);
});
it('keeps a mounted cache-hit image after eviction and a parent re-render',async()=>{
  await coverReadiness.load('first');
  const view=render(<CoverImage reference="first" alt="Cover" eager/>);
  for(let i=0;i<64;i++)await coverReadiness.load(`other-${i}`);
  expect(coverReadiness.peek('first')).toBeUndefined();
  const calls=vi.mocked(libraryService.resolveCover).mock.calls.length;
  view.rerender(<CoverImage reference="first" alt="Cover" eager/>);
  expect(screen.queryByLabelText('Loading cover')).toBeNull();
  expect(screen.getByRole('img',{name:'Cover'}).getAttribute('src')).toContain('first');
  expect(libraryService.resolveCover).toHaveBeenCalledTimes(calls);
});
it('defers cold offscreen images, then starts when they approach the viewport',async()=>{
  let intersect!:(entries:{isIntersecting:boolean}[])=>void;
  const disconnect=vi.fn();
  vi.stubGlobal('IntersectionObserver',class {constructor(callback:typeof intersect){intersect=callback}observe(){}disconnect=disconnect;});
  render(<CoverImage reference="offscreen" alt="Cover"/>);
  expect(libraryService.resolveCover).not.toHaveBeenCalled();
  await act(async()=>{intersect([{isIntersecting:true}]);});
  expect(screen.getByRole('img',{name:'Cover'})).toBeTruthy();expect(disconnect).toHaveBeenCalled();
});
it('replaces changed references and refreshes mounted images after restore invalidation',async()=>{
  const view=render(<CoverImage reference="old" alt="Cover" eager/>);await screen.findByRole('img',{name:'Cover'});
  view.rerender(<CoverImage reference="new" alt="Cover" eager/>);
  expect(screen.queryByRole('img',{name:'Cover'})).toBeNull();
  await screen.findByRole('img',{name:'Cover'});
  await act(async()=>{coverReadiness.clear();});
  expect(screen.getByRole('img',{name:'Cover'}).getAttribute('src')).toContain('new');
  expect(libraryService.resolveCover).toHaveBeenCalledTimes(3);
});
