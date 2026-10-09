import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { BookDetail, BookQuery } from "../types";
import { BookCard } from "../components/BookCard";

export function LibraryPage({books,query,onQuery,onOpen,view,loading}:{books:BookDetail[];query:BookQuery;onQuery:(q:BookQuery)=>void;onOpen:(b:BookDetail)=>void;view:"grid"|"list";loading:boolean}){
  const active=[query.status&&query.status!=="All",query.format&&query.format!=="All",query.minRating].filter(Boolean).length;
  return <div className="page library-page">
    <section className="filter-bar" aria-label="Library filters">
      <span className="filter-label"><SlidersHorizontal size={16}/> Filter{active?` · ${active}`:""}</span>
      <label>Status<select value={query.status||"All"} onChange={e=>onQuery({...query,status:e.target.value})}><option>All</option><option>Want to Read</option><option>Unread</option><option>Reading</option><option>Finished</option><option>Did Not Finish</option></select><ChevronDown size={14}/></label>
      <label>Format<select value={query.format||"All"} onChange={e=>onQuery({...query,format:e.target.value})}><option>All</option><option>Hardcover</option><option>Paperback</option><option>Mass Market Paperback</option><option>Ebook</option><option>Audiobook</option></select><ChevronDown size={14}/></label>
      <label>Rating<select value={query.minRating||0} onChange={e=>onQuery({...query,minRating:+e.target.value||undefined})}><option value="0">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="5">5 stars</option></select><ChevronDown size={14}/></label>
      <label className="sort-control">Sort<select value={query.sort||"date_added_desc"} onChange={e=>onQuery({...query,sort:e.target.value})}><option value="date_added_desc">Recently added</option><option value="title_asc">Title A–Z</option><option value="author_asc">Author A–Z</option><option value="publication_year_desc">Newest published</option><option value="rating_desc">Highest rated</option></select><ChevronDown size={14}/></label>
    </section>
    {loading?<div className={`book-grid ${view}`}>{Array.from({length:8}).map((_,i)=><div className="book-skeleton" key={i}><i/><span/><small/></div>)}</div>:books.length?<div className={`book-grid ${view}`}>{books.map(b=><BookCard key={b.id} book={b} onOpen={()=>onOpen(b)} view={view}/>)}</div>:<section className="empty-state"><span className="empty-books"><i/><i/><i/></span><h2>{query.search||active?"No books match these filters":"Your shelves are waiting"}</h2><p>{query.search||active?"Try a different search or clear one of the filters.":"Add your first book and begin building a library that feels like yours."}</p>{(query.search||active)&&<button className="button secondary" onClick={()=>onQuery({sort:query.sort})}>Clear filters</button>}</section>}
  </div>;
}
