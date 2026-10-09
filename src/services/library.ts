import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { BackupSummary, RestoreResult } from "../types";
import type { AppInfo, BookDetail, BookInput, BookQuery, Collection, MetadataResult, Statistics } from "../types";
import { demoBooks, demoCollections } from "./demo";

const inTauri = () => "__TAURI_INTERNALS__" in window;
const KEY = "meridian-demo-library-v1";
const COLLECTION_KEY = "meridian-demo-collections-v1";

function localBooks(): BookDetail[] {
  const saved = localStorage.getItem(KEY);
  return saved ? JSON.parse(saved) : demoBooks;
}
function saveLocal(books: BookDetail[]) { localStorage.setItem(KEY, JSON.stringify(books)); }
function localCollections(): Collection[] {
  const saved = localStorage.getItem(COLLECTION_KEY);
  return saved ? JSON.parse(saved) : demoCollections;
}
function sortBooks(books: BookDetail[], sort = "date_added_desc") {
  const copy = [...books];
  const field = sort.replace(/_(asc|desc)$/, ""); const dir = sort.endsWith("desc") ? -1 : 1;
  return copy.sort((a,b) => {
    const av = field === "author" ? a.authors[0] : field === "publication_year" ? a.publicationYear ?? 0 : field === "rating" ? a.rating ?? 0 : field === "date_added" ? a.dateAdded : a.title;
    const bv = field === "author" ? b.authors[0] : field === "publication_year" ? b.publicationYear ?? 0 : field === "rating" ? b.rating ?? 0 : field === "date_added" ? b.dateAdded : b.title;
    return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
  });
}

export const libraryService = {
  async listBooks(query: BookQuery = {}): Promise<BookDetail[]> {
    if (inTauri()) return invoke("list_books", { query });
    const term = query.search?.trim().toLowerCase();
    let books = localBooks().filter(b => !term || [b.title, b.subtitle, ...b.authors, b.isbn10, b.isbn13, b.series, ...b.tags].filter(Boolean).join(" ").toLowerCase().includes(term));
    if (query.status && query.status !== "All") books = books.filter(b => b.status === query.status);
    if (query.format && query.format !== "All") books = books.filter(b => b.format === query.format);
    if (query.minRating) books = books.filter(b => (b.rating ?? 0) >= query.minRating!);
    if (query.collectionId) books = books.filter(b => b.collectionIds.includes(query.collectionId!));
    return sortBooks(books, query.sort);
  },
  async getBook(id: number): Promise<BookDetail> { return inTauri() ? invoke("get_book", { id }) : localBooks().find(b => b.id === id)!; },
  async createBook(input: BookInput): Promise<BookDetail> {
    if (inTauri()) return invoke("create_book", { input });
    const books = localBooks(); const book = { ...input, id: Math.max(0,...books.map(b=>b.id))+1, dateAdded: new Date().toISOString().slice(0,10) } as BookDetail;
    saveLocal([...books, book]); return book;
  },
  async updateBook(id: number, input: BookInput): Promise<BookDetail> {
    if (inTauri()) return invoke("update_book", { id, input });
    const books = localBooks(); const current = books.find(b=>b.id===id)!; const next = { ...current, ...input };
    saveLocal(books.map(b=>b.id===id ? next : b)); return next;
  },
  async deleteBook(id: number): Promise<void> { if (inTauri()) return invoke("delete_book", { id }); saveLocal(localBooks().filter(b=>b.id!==id)); },
  async listCollections(): Promise<Collection[]> { return inTauri() ? invoke("list_collections") : localCollections(); },
  async createCollection(name: string, description = ""): Promise<Collection> {
    if (inTauri()) return invoke("create_collection", { name, description });
    const all=localCollections(); const c={id:Math.max(0,...all.map(x=>x.id))+1,name,description,bookCount:0,covers:[]}; localStorage.setItem(COLLECTION_KEY,JSON.stringify([...all,c])); return c;
  },
  async renameCollection(id:number,name:string,description=""):Promise<Collection>{
    if(inTauri()) return invoke("rename_collection",{id,name,description});
    const all=localCollections();const current=all.find(c=>c.id===id)!;const next={...current,name,description};localStorage.setItem(COLLECTION_KEY,JSON.stringify(all.map(c=>c.id===id?next:c)));return next;
  },
  async deleteCollection(id: number): Promise<void> { if(inTauri()) return invoke("delete_collection",{id}); localStorage.setItem(COLLECTION_KEY,JSON.stringify(localCollections().filter(c=>c.id!==id))); },
  async getStatistics(): Promise<Statistics> {
    if (inTauri()) return invoke("get_statistics");
    const b=localBooks(), year=String(new Date().getFullYear());
    const counts=(key:"status"|"format")=>Object.entries(b.reduce((a,x)=>(a[x[key]]=(a[x[key]]||0)+1,a),{} as Record<string,number>)).map(([label,value])=>({label,value}));
    const authors=Object.entries(b.flatMap(x=>x.authors).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([label,value])=>({label,value}));
    const rated=b.filter(x=>x.rating);
    return { totalBooks:b.length, finished:b.filter(x=>x.status==="Finished").length, reading:b.filter(x=>x.status==="Reading").length, unread:b.filter(x=>x.status==="Unread").length, addedThisYear:b.filter(x=>x.dateAdded.startsWith(year)).length, finishedThisYear:b.filter(x=>x.dateFinished?.startsWith(year)).length, pagesRead:b.filter(x=>x.status==="Finished").reduce((n,x)=>n+(x.pageCount||0),0), averageRating:rated.length?rated.reduce((n,x)=>n+(x.rating||0),0)/rated.length:null, topAuthors:authors,statusCounts:counts("status"),formatCounts:counts("format"),activity:[{label:"Jan",value:1},{label:"Feb",value:1},{label:"Mar",value:0},{label:"Apr",value:1},{label:"May",value:0},{label:"Jun",value:1},{label:"Jul",value:0},{label:"Aug",value:0},{label:"Sep",value:0},{label:"Oct",value:0},{label:"Nov",value:0},{label:"Dec",value:0}] };
  },
  async lookupIsbn(isbn:string):Promise<MetadataResult>{ if(inTauri()) return invoke("lookup_isbn",{isbn}); throw new Error("ISBN lookup is available in the desktop app."); },
  async getAppInfo():Promise<AppInfo>{ return inTauri()?invoke("get_app_info"):{databasePath:"Browser preview · local storage",coversPath:"Managed by the desktop app",version:"0.1.0"}; },
  async exportLibrary():Promise<string>{ return inTauri()?invoke("export_library"):JSON.stringify({version:1,books:localBooks(),collections:localCollections()},null,2); },
  async saveBackup():Promise<boolean>{
    if(!inTauri()) throw new Error("Database backup is available in the desktop app.");
    const path=await save({defaultPath:`meridian-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.json`,filters:[{name:"Meridian backup",extensions:["json"]}]});
    if(!path)return false;
    await invoke("save_backup",{path});return true;
  },
  async inspectBackup(json:string):Promise<BackupSummary>{
    if(!inTauri()) throw new Error("Database restore is available in the desktop app.");
    return invoke("inspect_backup",{json});
  },
  async restoreBackup(json:string):Promise<RestoreResult>{
    if(!inTauri()) throw new Error("Database restore is available in the desktop app.");
    return invoke("restore_backup",{json});
  },
  resetDemo(){ localStorage.removeItem(KEY); localStorage.removeItem(COLLECTION_KEY); }
};
