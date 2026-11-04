import { describe, expect, it } from 'vitest';
import { findDuplicates, normalizeIsbn } from './duplicates';
import { EMPTY_BOOK } from '../types';
const input={...EMPTY_BOOK,title:'Dune',authors:['Frank Herbert'],isbn13:'9780441172719'};
const book={...input,id:1,dateAdded:'2026-10-10'};
describe('duplicate matching',()=>{
  it('equates valid ISBN-10 and ISBN-13, including hyphens and check digit X',()=>{
    expect(normalizeIsbn('0-441-17271-7')).toBe('9780441172719');
    expect(normalizeIsbn('080442957x')).toBe('9780804429573');
    expect(findDuplicates([{...book,isbn13:undefined,isbn10:'0441172717'}],input)[0].reason).toBe('isbn');
  });
  it('rejects invalid checksums and ignores empty identifiers',()=>{
    expect(normalizeIsbn('9780441172718')).toBeUndefined();
    expect(normalizeIsbn('0441172718')).toBeUndefined();
    expect(findDuplicates([{...book,title:'Other',isbn13:''}],{...input,isbn13:''})).toEqual([]);
  });
  it('matches normalized title plus an author across editions, and excludes self',()=>{
    const other={...book,title:' DUNE  ',authors:[' FRANK   HERBERT '],isbn13:'9780593099322',format:'Ebook' as const};
    expect(findDuplicates([other],input)[0].reason).toBe('titleAuthor');
    expect(findDuplicates([other],input,1)).toEqual([]);
    expect(findDuplicates([{...other,authors:['Different author']}],input)).toEqual([]);
  });
});
