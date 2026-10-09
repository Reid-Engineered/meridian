import { useCallback, useEffect, useState } from "react";
import { BookForm } from "./components/BookForm";
import { BookDetailDrawer } from "./components/BookDetailDrawer";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Sidebar, type Page } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { LibraryPage } from "./pages/LibraryPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { ReadingPage } from "./pages/ReadingPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { libraryService } from "./services/library";
import type { AppInfo, BookDetail, BookInput, BookQuery, Collection, Statistics } from "./types";

export default function App(){
  const [page,setPage]=useState<Page>("library"),[books,setBooks]=useState<BookDetail[]>([]),[allBooks,setAllBooks]=useState<BookDetail[]>([]),[collections,setCollections]=useState<Collection[]>([]),[stats,setStats]=useState<Statistics|null>(null),[info,setInfo]=useState<AppInfo|null>(null);
  const [query,setQuery]=useState<BookQuery>({sort:"date_added_desc"}),[selected,setSelected]=useState<BookDetail|null>(null),[editing,setEditing]=useState<BookDetail|undefined>(),[formOpen,setFormOpen]=useState(false),[confirmDelete,setConfirmDelete]=useState<BookDetail|null>(null),[loading,setLoading]=useState(true),[view,setView]=useState<"grid"|"list">(()=>localStorage.getItem("meridian-view")==="list"?"list":"grid"),[dark,setDark]=useState(()=>localStorage.getItem("meridian-theme")==="dark"),[toast,setToast]=useState("");
  const refresh=useCallback(async()=>{setLoading(true);try{const [filtered,all,c,s,i]=await Promise.all([libraryService.listBooks(query),libraryService.listBooks({sort:"date_added_desc"}),libraryService.listCollections(),libraryService.getStatistics(),libraryService.getAppInfo()]);setBooks(filtered);setAllBooks(all);setCollections(c);setStats(s);setInfo(i)}finally{setLoading(false)}},[query]);
  useEffect(()=>{refresh()},[refresh]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?"dark":"light";localStorage.setItem("meridian-theme",dark?"dark":"light")},[dark]);
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if(e.defaultPrevented||document.querySelector('[aria-modal="true"]'))return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="n"){e.preventDefault();setEditing(undefined);setFormOpen(true)}if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setPage("library");setTimeout(()=>document.querySelector<HTMLInputElement>(".global-search input")?.focus(),0)}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[]);
  const notify=(message:string)=>{setToast(message);setTimeout(()=>setToast(""),2600)};
  const saveBook=async(input:BookInput)=>{const saved=editing?await libraryService.updateBook(editing.id,input):await libraryService.createBook(input);setFormOpen(false);setEditing(undefined);setSelected(saved);notify(editing?"Changes saved":"Book added to your library");await refresh()};
  const deleteBook=async()=>{if(!confirmDelete)return;await libraryService.deleteBook(confirmDelete.id);setSelected(null);setConfirmDelete(null);notify("Book removed");await refresh()};
  const exportLibrary=async()=>{const data=await libraryService.exportLibrary();const blob=new Blob([data],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`meridian-catalog-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);notify("Catalog exported")};
  const content=page==="library"?<LibraryPage books={books} query={query} onQuery={setQuery} onOpen={setSelected} view={view} onView={v=>{setView(v);localStorage.setItem("meridian-view",v)}} loading={loading}/>:page==="collections"?<CollectionsPage collections={collections} books={allBooks} onCreate={async(n,d)=>{await libraryService.createCollection(n,d);notify("Collection created");await refresh()}} onRename={async(id,n,d)=>{await libraryService.renameCollection(id,n,d);notify("Collection renamed");await refresh()}} onDelete={async id=>{await libraryService.deleteCollection(id);notify("Collection deleted");await refresh()}} onOpenBook={setSelected}/>:page==="reading"?<ReadingPage books={allBooks} onOpen={setSelected}/>:page==="statistics"?<StatisticsPage stats={stats}/>:<SettingsPage dark={dark} onTheme={setDark} info={info} onExport={exportLibrary} onRestored={async()=>{setSelected(null);setEditing(undefined);setFormOpen(false);await refresh()}} onReset={()=>{libraryService.resetDemo();refresh();notify("Preview library restored")}}/>;
  return <div className="app-shell"><Sidebar page={page} onPage={setPage} onAdd={()=>{setEditing(undefined);setFormOpen(true)}}/><main><Topbar page={page} dark={dark} onToggleTheme={()=>setDark(!dark)} search={query.search||""} onSearch={s=>setQuery(q=>({...q,search:s}))}/>{content}</main>
    {selected&&<BookDetailDrawer book={selected} onClose={()=>setSelected(null)} onEdit={()=>{setEditing(selected);setSelected(null);setFormOpen(true)}} onDelete={()=>setConfirmDelete(selected)}/>} {formOpen&&<BookForm book={editing} collections={collections} onSave={saveBook} onClose={()=>{setFormOpen(false);setEditing(undefined)}}/>}
    {confirmDelete&&<ConfirmDialog title={`Remove “${confirmDelete.title}”?`} body="This removes the owned copy and its reading history from your library. This cannot be undone." confirm="Remove book" onClose={()=>setConfirmDelete(null)} onConfirm={deleteBook}/>} {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}
