import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { BackupSummary, RestoreResult, ImportedCover, CoverStorage, BackupFileSelection } from "../types";
import type { AppInfo, BookDetail, BookInput, BookQuery, Collection, MetadataResult, Statistics } from "../types";
import { demoBooks, demoCollections } from "./demo";
import { CoverReadiness } from "./coverReadiness";

const inTauri = () => "__TAURI_INTERNALS__" in window;
const coverCache = new Map<string, Promise<string>>();
export const coverReadiness = new CoverReadiness(reference => libraryService.resolveCover(reference));
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
/** Mirrors the native ORDER BY: `<field>_<asc|desc>`; missing years, ratings and authors sort last; ties by title. */
function sortBooks(books: BookDetail[], sort = "date_added_desc") {
  const m = /^(title|author|publication_year|rating|date_added)_(asc|desc)$/.exec(sort) ?? [, "date_added", "desc"];
  const field = m[1], dir = m[2] === "desc" ? -1 : 1;
  const key = (b: BookDetail): string | number | null => field === "author" ? b.authors[0] ?? null : field === "publication_year" ? b.publicationYear ?? null
    : field === "rating" ? b.rating ?? null : field === "date_added" ? b.dateAdded : b.title;
  const text = (v: string | number) => String(v).toLocaleLowerCase();
  return [...books].sort((a, b) => {
    const av = key(a), bv = key(b);
    if (av === null || bv === null) return av === bv ? a.title.localeCompare(b.title) : av === null ? 1 : -1;
    const primary = typeof av === "number" && typeof bv === "number" ? av - bv : text(av).localeCompare(text(bv), undefined, { numeric: true });
    return primary !== 0 ? primary * dir : field === "date_added" ? (a.id - b.id) * dir : a.title.localeCompare(b.title);
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
    const path=await save({defaultPath:`meridian-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.meridian.zip`,filters:[{name:"Portable Meridian backup",extensions:["zip"]}]});
    if(!path)return false;
    await invoke("save_portable_backup",{path});return true;
  },
  async chooseCover():Promise<ImportedCover|null>{
    if(!inTauri())throw new Error("Cover import is available in the desktop app.");
    const path=await open({multiple:false,directory:false,filters:[{name:"Cover image",extensions:["png","jpg","jpeg","webp"]}]});
    if(!path||Array.isArray(path))return null;
    return invoke("import_cover",{path});
  },
  async resolveCover(reference:string):Promise<string>{
    if(!reference.startsWith('meridian-cover:'))return reference;
    let cached=coverCache.get(reference);
    if(cached){coverCache.delete(reference);coverCache.set(reference,cached);}
    if(!cached){cached=invoke<string>('read_cover',{reference}).catch(error=>{if(coverCache.get(reference)===cached)coverCache.delete(reference);throw error});coverCache.set(reference,cached);if(coverCache.size>128)coverCache.delete(coverCache.keys().next().value!);}
    return cached;
  },
  async getCoverStorage():Promise<CoverStorage>{return inTauri()?invoke('get_cover_storage'):{files:0,bytes:0};},
  async chooseBackup():Promise<BackupFileSelection|null>{
    if(!inTauri())throw new Error("Restore is available in the desktop app.");
    const path=await open({multiple:false,directory:false,filters:[{name:"Meridian backup",extensions:["zip","json"]}]});
    if(!path||Array.isArray(path))return null;
    const inspection=await invoke<Omit<BackupFileSelection,'path'|'name'>>('inspect_backup_file',{path});
    return {...inspection,path,name:path.split(/[\\/]/).pop()||path};
  },
  async restoreBackupFile(selection:BackupFileSelection):Promise<RestoreResult>{
    const result=await invoke<RestoreResult>('restore_backup_file',{path:selection.path,digest:selection.digest});coverCache.clear();coverReadiness.clear();return result;
  },
  async inspectBackup(json:string):Promise<BackupSummary>{
    if(!inTauri()) throw new Error("Database restore is available in the desktop app.");
    return invoke("inspect_backup",{json});
  },
  async restoreBackup(json:string):Promise<RestoreResult>{
    if(!inTauri()) throw new Error("Database restore is available in the desktop app.");
    const result=await invoke<RestoreResult>("restore_backup",{json});coverCache.clear();coverReadiness.clear();return result;
  },
  resetDemo(){ localStorage.removeItem(KEY); localStorage.removeItem(COLLECTION_KEY); coverCache.clear();coverReadiness.clear(); }
};
