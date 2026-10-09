import { Moon, Search, Sun } from "lucide-react";
import type { Page } from "./Sidebar";

const titles:Record<Page,{title:string;eyebrow:string}>={
  library:{title:"My Library",eyebrow:"Your collection"}, collections:{title:"Collections",eyebrow:"Curated shelves"},
  reading:{title:"Reading",eyebrow:"Your reading life"}, statistics:{title:"Statistics",eyebrow:"By the numbers"},
  settings:{title:"Settings",eyebrow:"Preferences & data"}
};
export function Topbar({page,dark,onToggleTheme,search,onSearch}:{page:Page;dark:boolean;onToggleTheme:()=>void;search:string;onSearch:(s:string)=>void}){
  const t=titles[page];
  return <header className="topbar"><div><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1></div>
    <div className="topbar-actions">
      {page==="library"&&<label className="global-search"><Search size={17}/><input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Search your library…" aria-label="Search your library"/><kbd>{navigator.platform.includes("Mac")?"⌘K":"Ctrl K"}</kbd></label>}
      <button className="icon-button" onClick={onToggleTheme} aria-label="Toggle theme">{dark?<Sun size={18}/>:<Moon size={18}/>}</button>
    </div></header>;
}
