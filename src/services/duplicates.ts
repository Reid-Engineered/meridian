import type { BookDetail, BookInput, DuplicateMatch } from '../types';
const text = (value: string) => value.trim().replace(/\s+/gu, ' ').toLowerCase();
export function normalizeIsbn(value: string): string | undefined {
  const s = value.replace(/[\s-]/gu, '').toUpperCase();
  if (/^\d{13}$/.test(s) && [...s].reduce((sum,c,i)=>sum+Number(c)*(i%2?3:1),0)%10===0) return s;
  if (/^\d{9}[\dX]$/.test(s) && [...s].reduce((sum,c,i)=>sum+(c==='X'?10:Number(c))*(10-i),0)%11===0) {
    const prefix=`978${s.slice(0,9)}`;
    const sum=[...prefix].reduce((n,c,i)=>n+Number(c)*(i%2?3:1),0);
    return `${prefix}${(10-sum%10)%10}`;
  }
}
export function findDuplicates(books: BookDetail[], input: BookInput, exclude?: number): DuplicateMatch[] {
  const ids=[input.isbn10,input.isbn13].filter((s):s is string=>!!s?.trim());
  return books.filter(b=>b.id!==exclude).flatMap(book=>{
    const existing=[book.isbn10,book.isbn13].filter((s):s is string=>!!s?.trim());
    const exact=ids.some(a=>existing.some(b=>(normalizeIsbn(a)!==undefined && normalizeIsbn(a)===normalizeIsbn(b)) || text(a).replace(/-/g,'')===text(b).replace(/-/g,'')));
    const possible=text(input.title)===text(book.title) && input.authors.some(a=>!!text(a) && book.authors.some(b=>text(a)===text(b)));
    return exact || possible ? [{book,reason:exact?'isbn' as const:'titleAuthor' as const}] : [];
  }).sort((a,b)=>Number(b.reason==='isbn')-Number(a.reason==='isbn') || a.book.id-b.book.id);
}
