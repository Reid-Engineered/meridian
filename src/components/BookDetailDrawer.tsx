import { CalendarDays, Edit3, MapPin, Quote, Trash2, X } from "lucide-react";
import type { BookDetail } from "../types";
import { Stars, StatusBadge } from "./BookCard";

export function BookDetailDrawer({book,onClose,onEdit,onDelete}:{book:BookDetail;onClose:()=>void;onEdit:()=>void;onDelete:()=>void}){
  const progress=book.pageCount&&book.currentPage?Math.round(book.currentPage/book.pageCount*100):0;
  return <div className="drawer-layer" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="detail-drawer" aria-label={`${book.title} details`}>
    <header className="drawer-header"><span>Book details</span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19}/></button></header>
    <div className="drawer-scroll"><section className="detail-hero"><div className="detail-cover">{book.coverUrl?<img src={book.coverUrl} alt=""/>:<div className="cover-placeholder"><span>{book.title}</span></div>}</div><div><StatusBadge status={book.status}/><h2>{book.title}</h2>{book.subtitle&&<p className="subtitle">{book.subtitle}</p>}<p className="detail-authors">{book.authors.join(", ")||"Unknown author"}</p><Stars value={book.rating??0}/>{book.series&&<p className="series">{book.series}{book.seriesPosition?` · Book ${book.seriesPosition}`:""}</p>}</div></section>
      {book.status==="Reading"&&book.pageCount&&<section className="reading-progress"><div><span>Reading progress</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div><small>Page {book.currentPage??0} of {book.pageCount}</small></section>}
      {book.description&&<section className="detail-section"><h3>About this book</h3><p>{book.description}</p></section>}
      <section className="detail-section"><h3>Edition & copy</h3><dl className="detail-grid"><div><dt>Format</dt><dd>{book.format}</dd></div><div><dt>Published</dt><dd>{[book.publisher,book.publicationYear].filter(Boolean).join(" · ")||"—"}</dd></div><div><dt>Pages</dt><dd>{book.pageCount??"—"}</dd></div><div><dt>Language</dt><dd>{book.language||"—"}</dd></div><div><dt>ISBN</dt><dd>{book.isbn13||book.isbn10||"—"}</dd></div><div><dt>Condition</dt><dd>{book.condition||"—"}</dd></div></dl></section>
      {(book.location||book.dateAcquired)&&<section className="detail-facts">{book.location&&<p><MapPin size={16}/><span><small>Lives at</small>{book.location}</span></p>}{book.dateAcquired&&<p><CalendarDays size={16}/><span><small>Acquired</small>{book.dateAcquired}</span></p>}</section>}
      {book.tags.length>0&&<section className="detail-section"><h3>Tags</h3><div className="tag-row">{book.tags.map(t=><span key={t}>{t}</span>)}</div></section>}
      {(book.notes||book.review)&&<section className="detail-section notes-section"><Quote size={20}/><div>{book.review&&<><h3>My review</h3><p>{book.review}</p></>}{book.notes&&<><h3>Notes</h3><p>{book.notes}</p></>}</div></section>}
    </div>
    <footer className="drawer-actions"><button className="button danger-quiet" onClick={onDelete}><Trash2 size={16}/>Delete</button><button className="button primary" onClick={onEdit}><Edit3 size={16}/>Edit book</button></footer>
  </aside></div>;
}
