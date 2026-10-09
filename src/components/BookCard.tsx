import { CoverImage } from "./CoverImage";
import { Headphones, MoreHorizontal } from "lucide-react";
import type { BookDetail } from "../types";

export function Stars({value=0,interactive=false,onChange}:{value?:number;interactive?:boolean;onChange?:(v:number)=>void}){
  if(!interactive) return <span className="stars" role="img" aria-label={`${value} out of 5 stars`}><span aria-hidden="true">{[1,2,3,4,5].map(n=>n<=value?"★":"☆").join("")}</span></span>;
  return <span className={`stars ${interactive?"interactive":""}`} aria-label={`${value} out of 5 stars`}>{[1,2,3,4,5].map(n=><button type="button" tabIndex={interactive?0:-1} key={n} onClick={()=>interactive&&onChange?.(n)} aria-label={`Rate ${n} stars`}>{n<=value?"★":"☆"}</button>)}</span>;
}
export function StatusBadge({status}:{status:BookDetail["status"]}){return <span className={`status status-${status.toLowerCase().replace(/ /g,"-")}`}>{status}</span>}

export function BookCard({book,onOpen,view}:{book:BookDetail;onOpen:()=>void;view:"grid"|"list"}){
  const progress=book.pageCount&&book.currentPage?Math.round(book.currentPage/book.pageCount*100):0;
  return <article className={`book-card ${view}`} onClick={onOpen}>
    <div className="cover-wrap">
      {book.coverUrl?<CoverImage reference={book.coverUrl} alt={`Cover of ${book.title}`} />:<div className="cover-placeholder"><span>{book.title}</span><small>{book.authors.join(", ")}</small></div>}
      <div className="cover-overlay"><StatusBadge status={book.status}/><button aria-label={`More actions for ${book.title}`} onClick={e=>{e.stopPropagation();onOpen()}}><MoreHorizontal size={17}/></button></div>
      {book.format==="Audiobook"&&<span className="format-corner"><Headphones size={14}/></span>}
      {book.status==="Reading"&&progress>0&&<span className="cover-progress"><i style={{width:`${progress}%`}}/></span>}
    </div>
    <div className="book-card-copy"><h3><button className="book-title" aria-label={`Open ${book.title}`}>{book.title}</button></h3><p>{book.authors.join(", ")||"Unknown author"}</p><div className="book-meta"><Stars value={book.rating??0}/><span>{book.publicationYear??""}</span></div></div>
  </article>;
}
