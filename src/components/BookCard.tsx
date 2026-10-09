import { useId } from "react";
import { Headphones } from "lucide-react";
import { CoverImage } from "./CoverImage";
import type { BookDetail } from "../types";

export function Stars({value=0,interactive=false,onChange}:{value?:number;interactive?:boolean;onChange?:(v:number)=>void}){
  if(!interactive) return <span className="stars" role="img" aria-label={`${value} out of 5 stars`}><span aria-hidden="true">{[1,2,3,4,5].map(n=>n<=value?"★":"☆").join("")}</span></span>;
  return <span className={`stars ${interactive?"interactive":""}`} aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(n=><button type="button" tabIndex={interactive?0:-1} key={n} onClick={()=>interactive&&onChange?.(n)} aria-label={`Rate ${n} stars`}>{n<=value?"★":"☆"}</button>)}</span>;
}
export function StatusBadge({status}:{status:BookDetail["status"]}){return <span className={`status status-${status.toLowerCase().replace(/ /g,"-")}`}>{status}</span>}
export const statusClass = (s: BookDetail["status"]) => `s-${s.toLowerCase().replace(/ /g, "-")}`;
export const progressOf = (b: BookDetail) => b.pageCount && b.currentPage ? Math.round(b.currentPage / b.pageCount * 100) : 0;

export function Cover({ book, className = "" }: { book: BookDetail; className?: string }) {
  return <span className={`lib-cover ${className}`}>
    {book.coverUrl ? <CoverImage reference={book.coverUrl} alt="" /> : <span className="lib-cover-blank"><span>{book.title}</span><small>{book.authors.join(", ")}</small></span>}
    {book.format === "Audiobook" && <span className="lib-corner" aria-hidden="true"><Headphones size={12} /></span>}
  </span>;
}

/** Grid tile: the cover is the object; status shows as text under it, never as a badge on the art. */
export function BookCard({ book, onOpen, selected }: { book: BookDetail; onOpen: () => void; selected: boolean }) {
  const id = useId();
  const reading = book.status === "Reading";
  const meta = reading && book.pageCount ? `Reading · ${progressOf(book)}%` : book.authors.join(", ") || "Unknown author";
  return <button type="button" className={`lib-tile${selected ? " is-selected" : ""}`} onClick={onOpen} aria-label={`Open ${book.title}`} aria-describedby={`${id}-meta`} aria-current={selected || undefined}>
    <Cover book={book} />
    <span className="lib-title">{book.title}</span>
    <span id={`${id}-meta`} className={`lib-meta${reading ? " acc" : ""}`}>{meta}</span>
  </button>;
}
