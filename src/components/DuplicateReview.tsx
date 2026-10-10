import { useRef, useState } from 'react';
import type { BookDetail, DuplicateMatch } from '../types';
import { useModalFocus } from './useModalFocus';
import { libraryService } from '../services/library';

export function DuplicateReview({matches,editing,onClose,onOpen,onCopy,onSeparate,onMerged}:{
  matches:DuplicateMatch[];editing?:BookDetail;onClose:()=>void;onOpen:(book:BookDetail)=>void;
  onCopy:(id:number)=>Promise<void>;onSeparate:()=>Promise<void>;onMerged:(book:BookDetail)=>Promise<void>;
}) {
  const [busy,setBusy]=useState(false), [error,setError]=useState(''),[merge,setMerge]=useState<BookDetail>();
  const lock=useRef(false);
  const ref=useModalFocus<HTMLDivElement>(()=>{if(!lock.current)onClose()});
  const run=async(action:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await action()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{lock.current=false;setBusy(false)}};
  return <div className="modal-backdrop" ref={ref} role="dialog" aria-modal="true" aria-labelledby="duplicate-title" tabIndex={-1}>
    <div className="duplicate-review">
      <h2 id="duplicate-title">{merge?'Review merge':'This book may already be in your library'}</h2>
      {merge && editing ? <>
        <p>Keep <strong>{editing.title}</strong> (entry #{editing.id}, {editing.format}) and remove entry #{merge.id} ({merge.format}).</p>
        <p>The kept entry retains its book details and current reading state. Both entries’ tags, collections, notes and reading history are preserved. The removed entry’s details are archived in the notes. A recovery backup is saved before merging.</p>
        <dl className="duplicate-comparison">{[editing,merge].map((b,i)=><div key={b.id}><dt>{i===0?'Keep':'Merge into kept entry'}</dt><dd>{b.title} · {b.authors.join(', ')}<br/>{b.isbn13||b.isbn10||'No ISBN'} · {b.format} · {b.publicationYear||'Year unknown'}<br/>{b.location||'No location'} · {b.status}<br/>Notes: {b.notes||'None'}<br/>Review: {b.review||'None'}<br/>{b.tags.length} tags · {b.collectionIds.length} collections</dd></div>)}</dl>
        <button type="button" className="button danger" disabled={busy} onClick={()=>run(async()=>onMerged(await libraryService.mergeBookCopies(editing.id,merge.id)))}>Confirm merge</button>
        <button type="button" className="button secondary" disabled={busy} onClick={()=>setMerge(undefined)}>Back</button>
      </> : <>
        <p>{editing?'Check existing entries before merging. Unsaved edits are not included in a merge.':'Choose an existing entry, add another owned copy, or keep a separate edition.'}</p>
        <ul>{matches.map(({book,reason})=><li key={book.id}>
          <strong>{book.title}</strong> · {book.authors.join(', ')}
          <p>{reason==='isbn'?'Matching ISBN':'Matching title and author'} · {book.format} · {book.publicationYear||'Year unknown'} · {book.location||'No location'} · entry #{book.id}</p>
          <button type="button" className="button secondary" disabled={busy} onClick={()=>onOpen(book)}>Open existing</button>
          {!editing && <button type="button" className="button secondary" disabled={busy} onClick={()=>run(()=>onCopy(book.id))}>Add another copy</button>}
          {editing && <button type="button" className="button secondary" disabled={busy} onClick={()=>setMerge(book)}>Review merge</button>}
        </li>)}</ul>
        {!editing && <p>Another copy uses the existing edition’s book details and your new reading status, notes, tags, collections and location.</p>}
        {(!matches.some(m=>m.reason==='isbn') || editing) && <button type="button" className="button primary" disabled={busy} onClick={()=>run(onSeparate)}>{editing?'Save changes anyway':'Keep as separate edition'}</button>}
      </>}
      {error&&<p role="alert">{error}</p>}
      <button type="button" data-modal-initial className="button secondary" disabled={busy} onClick={onClose}>Return to form</button>
      {busy&&<p role="status">Saving…</p>}
    </div>
  </div>;
}
