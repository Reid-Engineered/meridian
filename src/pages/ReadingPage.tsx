import { CoverImage } from "../components/CoverImage";
import { BookMarked, CheckCircle2 } from "lucide-react";
import type { BookDetail } from "../types";

export function ReadingPage({books,onOpen}:{books:BookDetail[];onOpen:(b:BookDetail)=>void}){
  const active=books.filter(b=>b.status==="Reading"), queue=books.filter(b=>b.status==="Want to Read"),finished=books.filter(b=>b.status==="Finished");
  return <div className="page reading-page"><section className="section-heading"><div><h2>Reading now</h2><p>Pick up where you left off.</p></div></section>
    <div className="reading-now">{active.map(b=>{const p=b.pageCount&&b.currentPage?Math.round(b.currentPage/b.pageCount*100):0;return <button className="reading-feature" onClick={()=>onOpen(b)} key={b.id}>{b.coverUrl&&<CoverImage reference={b.coverUrl} alt=""/>}<div><span className="form-kicker">In progress</span><h3>{b.title}</h3><p>{b.authors.join(", ")}</p><div className="progress-track"><i style={{width:`${p}%`}}/></div><small>{p}% · Page {b.currentPage??0} of {b.pageCount??"?"}</small></div></button>})}{!active.length&&<div className="reading-empty"><BookMarked size={32}/><p>Nothing in progress. Choose a book from your library when you’re ready.</p></div>}</div>
    <section className="reading-columns"><div><div className="subheading"><h2>Up next</h2><span>{queue.length}</span></div><div className="compact-books">{queue.map(b=><button onClick={()=>onOpen(b)} key={b.id}>{b.coverUrl&&<CoverImage reference={b.coverUrl} alt=""/>}<span><strong>{b.title}</strong><small>{b.authors.join(", ")}</small></span></button>)}</div></div><div><div className="subheading"><h2>Recently finished</h2><span>{finished.length}</span></div><div className="finished-list">{finished.slice(0,5).map(b=><button onClick={()=>onOpen(b)} key={b.id}><CheckCircle2 size={18}/><span><strong>{b.title}</strong><small>{b.dateFinished||"Finished"}</small></span><b>{b.rating?"★".repeat(b.rating):"—"}</b></button>)}</div></div></section>
  </div>;
}
