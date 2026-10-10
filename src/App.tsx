import { useCallback, useEffect, useMemo, useState } from "react";
import { BookForm } from "./components/BookForm";
import { BookInspector } from "./components/BookInspector";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Sidebar, type Page, type Scope } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { WindowChrome } from "./components/WindowChrome";
import { windowService } from "./services/window";
import { LibraryPage, LibraryToolbarActions } from "./pages/LibraryPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { ReadingPage } from "./pages/ReadingPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { coverReadiness, libraryService } from "./services/library";
import { useTheme } from "./theme";
import type { AppInfo, BookDetail, BookInput, BookQuery, Collection, ReadingStatus, Statistics } from "./types";

const pageTitles: Record<Exclude<Page, "library">, { title: string; subtitle: string }> = {
  collections: { title: "Collections", subtitle: "Curated shelves" }, reading: { title: "Reading Now", subtitle: "Pick up where you left off" },
  statistics: { title: "Statistics", subtitle: "Your reading life, by the numbers" }, settings: { title: "Settings", subtitle: "Preferences & data" },
};
const scopeOf = (q: BookQuery): Scope => q.collectionId ? { kind: "collection", id: q.collectionId }
  : q.status && q.status !== "All" ? { kind: "status", status: q.status as ReadingStatus } : { kind: "all" };
const plural = (n: number) => `${n} ${n === 1 ? "book" : "books"}`;

export default function App(){
  const [page,setPage]=useState<Page>("library"),[books,setBooks]=useState<BookDetail[]>([]),[allBooks,setAllBooks]=useState<BookDetail[]>([]),[collections,setCollections]=useState<Collection[]>([]),[stats,setStats]=useState<Statistics|null>(null),[info,setInfo]=useState<AppInfo|null>(null);
  const [query,setQuery]=useState<BookQuery>({sort:"date_added_desc"}),[selected,setSelected]=useState<BookDetail|null>(null),[editing,setEditing]=useState<BookDetail|undefined>(),[formOpen,setFormOpen]=useState(false),[confirmDelete,setConfirmDelete]=useState<BookDetail|null>(null),[loading,setLoading]=useState(true),[view,setView]=useState<"grid"|"list">(()=>localStorage.getItem("meridian-view")==="list"?"list":"grid"),[toast,setToast]=useState("");
  const theme=useTheme();
  const refresh=useCallback(async()=>{setLoading(true);try{const [filtered,all,c,s,i]=await Promise.all([libraryService.listBooks(query),libraryService.listBooks({sort:"date_added_desc"}),libraryService.listCollections(),libraryService.getStatistics(),libraryService.getAppInfo()]);setBooks(filtered);setAllBooks(all);setCollections(c);setStats(s);setInfo(i)}finally{setLoading(false)}},[query]);
  useEffect(()=>{refresh()},[refresh]);
  useEffect(()=>{
    // Warm the first shelf and likely next tabs, never the whole catalog.
    coverReadiness.preload([
      ...books.slice(0,24).map(b=>b.coverUrl),
      ...allBooks.filter(b=>b.status==="Reading").slice(0,8).map(b=>b.coverUrl),
      ...allBooks.filter(b=>b.status==="Want to Read").slice(0,4).map(b=>b.coverUrl),
      ...collections.slice(0,4).flatMap(c=>allBooks.filter(b=>b.collectionIds.includes(c.id)).slice(0,3).map(b=>b.coverUrl)),
    ]);
  },[books,allBooks,collections]);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.defaultPrevented||document.querySelector('[aria-modal="true"]'))return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="n"){e.preventDefault();setEditing(undefined);setFormOpen(true)}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPage("library");setTimeout(()=>document.querySelector<HTMLInputElement>(".global-search input")?.focus(),0)}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[]);
  const notify=(message:string)=>{setToast(message);setTimeout(()=>setToast(""),2600)};
  const saveBook=async(input:BookInput,source?:number)=>{const saved=editing?await libraryService.updateBook(editing.id,input):source!==undefined?await libraryService.createBookCopy(source,input):await libraryService.createBook(input);setFormOpen(false);setEditing(undefined);setSelected(saved);notify(editing?"Changes saved":"Book added to your library");await refresh()};
  const deleteBook=async()=>{if(!confirmDelete)return;await libraryService.deleteBook(confirmDelete.id);setSelected(null);setConfirmDelete(null);notify("Book removed");await refresh()};
  const exportLibrary=async()=>{const data=await libraryService.exportLibrary();const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`meridian-catalog-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);notify("Catalog exported")};
  const openAdd=()=>{setEditing(undefined);setFormOpen(true)};

  const scope=scopeOf(query);
  const statusCounts=useMemo(()=>allBooks.reduce<Partial<Record<ReadingStatus,number>>>((acc,b)=>{acc[b.status]=(acc[b.status]??0)+1;return acc},{}),[allBooks]);
  const nowReading=useMemo(()=>allBooks.filter(b=>b.status==="Reading").sort((a,b)=>(b.dateStarted??"").localeCompare(a.dateStarted??""))[0],[allBooks]);
  const navigate=(next:Page,nextScope?:Scope)=>{
    setPage(next);
    if(next==="library"&&nextScope)setQuery(q=>{const status=nextScope.kind==="status"?nextScope.status:undefined,collectionId=nextScope.kind==="collection"?nextScope.id:undefined;return q.status===status&&q.collectionId===collectionId?q:{...q,status,collectionId}});
  };
  const libraryTitle=scope.kind==="collection"?collections.find(c=>c.id===scope.id)?.name??"Collection":scope.kind==="status"?scope.status:"All Books";
  const head=page==="library"?{title:libraryTitle,subtitle:loading?"":query.search?`${plural(books.length)} matching “${query.search}”`:plural(books.length)}:pageTitles[page];

  const content=page==="library"?<LibraryPage books={books} allBooks={allBooks} query={query} onQuery={setQuery} onOpen={setSelected} view={view} loading={loading} selectedId={selected?.id} collections={collections} onAdd={openAdd}/>:page==="collections"?<CollectionsPage collections={collections} books={allBooks} onCreate={async(n,d)=>{await libraryService.createCollection(n,d);notify("Collection created");await refresh()}} onRename={async(id,n,d)=>{await libraryService.renameCollection(id,n,d);notify("Collection renamed");await refresh()}} onDelete={async id=>{await libraryService.deleteCollection(id);notify("Collection deleted");await refresh()}} onOpenBook={setSelected}/>:page==="reading"?<ReadingPage books={allBooks} onOpen={setSelected}/>:page==="statistics"?<StatisticsPage stats={stats}/>:<SettingsPage theme={theme.preference} onTheme={theme.setPreference} info={info} onExport={exportLibrary} onRestored={async()=>{setSelected(null);setEditing(undefined);setFormOpen(false);await refresh()}} onReset={()=>{libraryService.resetDemo();refresh();notify("Preview library restored")}}/>;
  return <><WindowChrome /><div className={`mac-shell${selected?" has-inspector":""}${windowService.hasCustomChrome()?" windows-shell":""}`}>
    <Sidebar page={page} scope={scope} total={allBooks.length} statusCounts={statusCounts} collections={collections} nowReading={nowReading} onNavigate={navigate} onOpenBook={setSelected}/>
    <main className="mac-content">
      <Toolbar title={head.title} subtitle={head.subtitle} onAdd={openAdd}>
        {page==="library"&&allBooks.length>0&&<LibraryToolbarActions query={query} onQuery={setQuery} view={view} onView={v=>{setView(v);try{localStorage.setItem("meridian-view",v)}catch{/* view stays in memory */}}}
          collections={collections} shown={books.length} total={allBooks.length} allBooks={allBooks} onOpen={setSelected}/>}
      </Toolbar>
      {content}
    </main>
    {selected&&<BookInspector key={selected.id} book={selected} onClose={()=>setSelected(null)} onEdit={()=>{setEditing(selected);setSelected(null);setFormOpen(true)}} onDelete={()=>setConfirmDelete(selected)}/>} {formOpen&&<BookForm book={editing} collections={collections} onSave={saveBook} onOpenExisting={existing=>{setFormOpen(false);setEditing(undefined);setSelected(existing)}} onMerged={async merged=>{setFormOpen(false);setEditing(undefined);setSelected(merged);notify("Entries merged; recovery backup saved");await refresh()}} onClose={()=>{setFormOpen(false);setEditing(undefined)}}/>}
    {confirmDelete&&<ConfirmDialog title={`Remove “${confirmDelete.title}”?`} body="This removes the owned copy and its reading history from your library. This cannot be undone." confirm="Remove book" onClose={()=>setConfirmDelete(null)} onConfirm={deleteBook}/>} {toast&&<div className="toast" role="status">{toast}</div>}
  </div></>;
}
