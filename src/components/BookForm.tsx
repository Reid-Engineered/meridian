import { useEffect, useState } from "react";
import { BookOpen, Search, Upload, X } from "lucide-react";
import type { BookDetail, BookFormat, BookInput, Collection, MetadataResult, ReadingStatus } from "../types";
import { EMPTY_BOOK } from "../types";
import { libraryService } from "../services/library";

const statuses:ReadingStatus[]=["Want to Read","Unread","Reading","Finished","Did Not Finish"];
const formats:BookFormat[]=["Hardcover","Paperback","Mass Market Paperback","Ebook","Audiobook","Other"];
const asInput=(book?:BookDetail):BookInput=>book?{
  title:book.title,subtitle:book.subtitle??"",authors:book.authors,description:book.description??"",publicationYear:book.publicationYear??undefined,
  series:book.series??"",seriesPosition:book.seriesPosition??undefined,isbn10:book.isbn10??"",isbn13:book.isbn13??"",publisher:book.publisher??"",pageCount:book.pageCount??undefined,
  language:book.language??"",format:book.format,status:book.status,currentPage:book.currentPage??undefined,rating:book.rating??undefined,coverUrl:book.coverUrl??"",tags:book.tags,
  collectionIds:book.collectionIds,location:book.location??"",condition:book.condition??"",notes:book.notes??"",review:book.review??"",dateAcquired:book.dateAcquired??"",dateStarted:book.dateStarted??"",dateFinished:book.dateFinished??""
}:structuredClone(EMPTY_BOOK);

export function BookForm({book,collections,onSave,onClose}:{book?:BookDetail;collections:Collection[];onSave:(b:BookInput)=>Promise<void>;onClose:()=>void}){
  const [form,setForm]=useState<BookInput>(()=>asInput(book)); const [tab,setTab]=useState<"details"|"reading"|"copy">("details");
  const [authorText,setAuthorText]=useState(form.authors.join(", ")); const [tagText,setTagText]=useState(form.tags.join(", ")); const [error,setError]=useState(""); const [saving,setSaving]=useState(false); const [isbnBusy,setIsbnBusy]=useState(false);
  useEffect(()=>{const esc=(e:KeyboardEvent)=>e.key==="Escape"&&onClose();window.addEventListener("keydown",esc);return()=>window.removeEventListener("keydown",esc)},[onClose]);
  const set=<K extends keyof BookInput>(key:K,value:BookInput[K])=>setForm(f=>({...f,[key]:value}));
  const applyMeta=(m:MetadataResult)=>setForm(f=>({...f,title:m.title||f.title,subtitle:m.subtitle??f.subtitle,authors:m.authors.length?m.authors:f.authors,publisher:m.publisher??f.publisher,publicationYear:m.publicationYear??f.publicationYear,pageCount:m.pageCount??f.pageCount,coverUrl:m.coverUrl??f.coverUrl,isbn10:m.isbn10??f.isbn10,isbn13:m.isbn13??f.isbn13,description:m.description??f.description}));
  const lookup=async()=>{const isbn=form.isbn13||form.isbn10;if(!isbn){setError("Enter an ISBN first.");return}setIsbnBusy(true);setError("");try{const m=await libraryService.lookupIsbn(isbn);applyMeta(m);setAuthorText(m.authors.join(", "));}catch(e){setError(e instanceof Error?e.message:"Metadata lookup is unavailable. You can continue manually.");}finally{setIsbnBusy(false)}};
  const submit=async(e:React.FormEvent)=>{e.preventDefault(); const authors=authorText.split(",").map(x=>x.trim()).filter(Boolean);const tags=tagText.split(",").map(x=>x.trim()).filter(Boolean);if(!form.title.trim()){setError("A title is required.");setTab("details");return}setSaving(true);setError("");try{await onSave({...form,title:form.title.trim(),authors,tags});}catch(e){setError(e instanceof Error?e.message:"The book could not be saved.");setSaving(false)}};
  return <div className="modal-backdrop"><form className="book-form" onSubmit={submit} aria-label={book?"Edit book":"Add book"}>
    <header className="form-header"><div><span className="form-kicker">{book?"Library copy":"New addition"}</span><h2>{book?"Edit book":"Add to your library"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
    <div className="form-tabs" role="tablist">{(["details","reading","copy"] as const).map(t=><button type="button" role="tab" aria-selected={tab===t} className={tab===t?"active":""} onClick={()=>setTab(t)} key={t}>{t==="copy"?"My copy":t[0].toUpperCase()+t.slice(1)}</button>)}</div>
    <div className="form-scroll">
    {tab==="details"&&<>
      <div className="isbn-lookup"><Search size={17}/><input value={form.isbn13||form.isbn10||""} onChange={e=>set("isbn13",e.target.value)} placeholder="ISBN-10 or ISBN-13" aria-label="ISBN"/><button type="button" onClick={lookup} disabled={isbnBusy}>{isbnBusy?"Looking up…":"Look up"}</button></div>
      <div className="field-grid"><label className="span-2">Title <b>*</b><input autoFocus value={form.title} onChange={e=>set("title",e.target.value)}/></label><label className="span-2">Subtitle<input value={form.subtitle} onChange={e=>set("subtitle",e.target.value)}/></label>
      <label className="span-2">Authors <small>Separate names with commas</small><input value={authorText} onChange={e=>setAuthorText(e.target.value)} placeholder="Ursula K. Le Guin"/></label>
      <label>Publication year<input type="number" value={form.publicationYear??""} onChange={e=>set("publicationYear",e.target.value?+e.target.value:undefined)}/></label><label>Publisher<input value={form.publisher} onChange={e=>set("publisher",e.target.value)}/></label>
      <label>Series<input value={form.series} onChange={e=>set("series",e.target.value)}/></label><label>Series number<input type="number" step="0.1" value={form.seriesPosition??""} onChange={e=>set("seriesPosition",e.target.value?+e.target.value:undefined)}/></label>
      <label>Pages<input type="number" value={form.pageCount??""} onChange={e=>set("pageCount",e.target.value?+e.target.value:undefined)}/></label><label>Language<input value={form.language} onChange={e=>set("language",e.target.value)}/></label>
      <label className="span-2">Description<textarea rows={4} value={form.description} onChange={e=>set("description",e.target.value)}/></label>
      <label className="span-2">Cover image URL or local path<div className="input-with-icon"><Upload size={16}/><input value={form.coverUrl} onChange={e=>set("coverUrl",e.target.value)} placeholder="https://… or a local image path"/></div></label></div>
    </>}
    {tab==="reading"&&<div className="field-grid"><label className="span-2">Reading status<select value={form.status} onChange={e=>set("status",e.target.value as ReadingStatus)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Current page<input type="number" min="0" value={form.currentPage??""} onChange={e=>set("currentPage",e.target.value?+e.target.value:undefined)}/></label><label>Rating<select value={form.rating??""} onChange={e=>set("rating",e.target.value?+e.target.value:undefined)}><option value="">Not rated</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}</select></label>
      <label>Date started<input type="date" value={form.dateStarted} onChange={e=>set("dateStarted",e.target.value)}/></label><label>Date finished<input type="date" value={form.dateFinished} onChange={e=>set("dateFinished",e.target.value)}/></label>
      <label className="span-2">Personal review<textarea rows={6} value={form.review} onChange={e=>set("review",e.target.value)} placeholder="What stayed with you?"/></label></div>}
    {tab==="copy"&&<div className="field-grid"><label>Format<select value={form.format} onChange={e=>set("format",e.target.value as BookFormat)}>{formats.map(f=><option key={f}>{f}</option>)}</select></label><label>Condition<input value={form.condition} onChange={e=>set("condition",e.target.value)} placeholder="Very Good"/></label>
      <label className="span-2">Physical location<input value={form.location} onChange={e=>set("location",e.target.value)} placeholder="Study · Shelf B"/></label><label>Date acquired<input type="date" value={form.dateAcquired} onChange={e=>set("dateAcquired",e.target.value)}/></label><label>ISBN-10<input value={form.isbn10} onChange={e=>set("isbn10",e.target.value)}/></label>
      <label className="span-2">Tags <small>Separate tags with commas</small><input value={tagText} onChange={e=>setTagText(e.target.value)} placeholder="favorite, signed, reference"/></label>
      <fieldset className="span-2"><legend>Collections</legend><div className="checkbox-grid">{collections.map(c=><label key={c.id}><input type="checkbox" checked={form.collectionIds.includes(c.id)} onChange={e=>set("collectionIds",e.target.checked?[...form.collectionIds,c.id]:form.collectionIds.filter(id=>id!==c.id))}/><span>{c.name}</span></label>)}</div></fieldset>
      <label className="span-2">Private notes<textarea rows={5} value={form.notes} onChange={e=>set("notes",e.target.value)} placeholder="Edition details, memories, lending notes…"/></label></div>}
    </div>
    {error&&<p className="form-error" role="alert"><BookOpen size={16}/>{error}</p>}
    <footer className="form-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving}>{saving?"Saving…":book?"Save changes":"Add book"}</button></footer>
  </form></div>;
}
