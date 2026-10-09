// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { CoverReadiness } from './coverReadiness';

beforeAll(()=>{Object.defineProperty(HTMLImageElement.prototype,'decode',{value:()=>Promise.resolve(),configurable:true,writable:true});});
beforeEach(()=>{vi.spyOn(HTMLImageElement.prototype,'decode').mockResolvedValue(undefined);});
afterEach(()=>vi.restoreAllMocks());

it('shares in-flight resolution/decode and reuses decoded images synchronously',async()=>{
  const resolve=vi.fn(async r=>`data:${r}`),cache=new CoverReadiness(resolve);
  const first=cache.load('a');expect(cache.load('a')).toBe(first);
  await first;expect(cache.peek('a')).toBe('data:a');await cache.load('a');
  expect(resolve).toHaveBeenCalledTimes(1);expect(HTMLImageElement.prototype.decode).toHaveBeenCalledTimes(1);
});
it('limits speculative work in a 10,000-cover library and promotes visible work',async()=>{
  const releases:(()=>void)[]=[];
  vi.mocked(HTMLImageElement.prototype.decode).mockImplementation(()=>new Promise<void>(done=>releases.push(done)));
  const resolve=vi.fn(async r=>r),cache=new CoverReadiness(resolve);
  cache.preload(Array.from({length:10000},(_,i)=>String(i)));
  await vi.waitFor(()=>expect(releases).toHaveLength(4));
  expect(resolve).toHaveBeenCalledTimes(4);
  const visible=cache.load('visible');releases[0]();
  await vi.waitFor(()=>expect(resolve).toHaveBeenLastCalledWith('visible'));
  // Finish the remaining bounded queue.
  vi.mocked(HTMLImageElement.prototype.decode).mockResolvedValue(undefined);
  for(const release of releases)release();await visible;
  await vi.waitFor(()=>expect(resolve).toHaveBeenCalledTimes(49));
});
it('evicts least recently used decoded images and retries failed decodes',async()=>{
  const resolve=vi.fn(async r=>r),cache=new CoverReadiness(resolve);
  await cache.load('keep');
  for(let i=0;i<63;i++)await cache.load(String(i));
  cache.peek('keep');await cache.load('new');
  expect(cache.peek('keep')).toBe('keep');expect(cache.peek('0')).toBeUndefined();
  vi.mocked(HTMLImageElement.prototype.decode).mockRejectedValueOnce(new Error('broken'));
  await expect(cache.load('bad')).rejects.toThrow('broken');expect(cache.peek('bad')).toBeUndefined();
  await cache.load('bad');expect(cache.peek('bad')).toBe('bad');
});
it('invalidates queued and active work without letting stale completion replace new covers',async()=>{
  let release!:()=>void;
  vi.mocked(HTMLImageElement.prototype.decode).mockImplementationOnce(()=>new Promise<void>(done=>{release=done}));
  const resolve=vi.fn(async r=>r),cache=new CoverReadiness(resolve),listener=vi.fn();cache.subscribe(listener);
  const old=cache.load('same');const rejected=expect(old).rejects.toThrow('invalidated');
  await vi.waitFor(()=>expect(release).toBeDefined());cache.clear();
  await cache.load('same');release();await rejected;
  expect(cache.peek('same')).toBe('same');expect(listener).toHaveBeenCalledTimes(1);expect(resolve).toHaveBeenCalledTimes(2);
});
it('releases stalled decode slots after timeout and permits retry',async()=>{
  vi.useFakeTimers();
  try {
    vi.mocked(HTMLImageElement.prototype.decode).mockImplementationOnce(()=>new Promise(()=>{}));
    const cache=new CoverReadiness(async r=>r),pending=cache.load('stalled');
    const rejected=expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(15000);await rejected;
    await cache.load('stalled');expect(cache.peek('stalled')).toBe('stalled');
  } finally {vi.useRealTimers();}
});
