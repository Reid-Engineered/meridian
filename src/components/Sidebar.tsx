import { BarChart3, BookCopy, BookOpen, LibraryBig, Plus, Settings, Target } from "lucide-react";

export type Page = "library"|"collections"|"reading"|"statistics"|"settings";
const items: {id:Page; label:string; icon:typeof BookOpen}[] = [
  {id:"library",label:"Library",icon:LibraryBig},{id:"collections",label:"Collections",icon:BookCopy},
  {id:"reading",label:"Reading",icon:BookOpen},{id:"statistics",label:"Statistics",icon:BarChart3},{id:"settings",label:"Settings",icon:Settings}
];

export function Sidebar({page,onPage,onAdd}:{page:Page;onPage:(p:Page)=>void;onAdd:()=>void}) {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><i/><i/><i/></span><span>Meridian</span></div>
    <button className="add-button" onClick={onAdd}><Plus size={17}/> Add book <kbd>⌘N</kbd></button>
    <nav aria-label="Primary">
      <p className="nav-label">Your library</p>
      {items.map(({id,label,icon:Icon})=><button key={id} className={`nav-item ${page===id?"active":""}`} onClick={()=>onPage(id)}><Icon size={18}/><span>{label}</span></button>)}
    </nav>
    <div className="sidebar-quote"><Target size={18}/><p>“A room without books is like a body without a soul.”</p><span>— Cicero</span></div>
  </aside>;
}
