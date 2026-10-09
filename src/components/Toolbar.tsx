import { LayoutGrid, List, Plus, Search } from "lucide-react";

type Props = {
  title: string; subtitle?: string;
  search?: { value: string; onChange: (s: string) => void };
  view?: { value: "grid" | "list"; onChange: (v: "grid" | "list") => void };
  onAdd: () => void;
};

const mac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

/** Unified window toolbar: title on the left, glass controls on the right. */
export function Toolbar({ title, subtitle, search, view, onAdd }: Props) {
  return <header className="mac-toolbar" data-tauri-drag-region>
    <div className="tb-title" data-tauri-drag-region><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="tb-actions">
      {view && <div className="glass seg" role="group" aria-label="View">
        <button className={view.value === "grid" ? "on" : ""} aria-pressed={view.value === "grid"} onClick={() => view.onChange("grid")} aria-label="Grid view"><LayoutGrid size={15} /></button>
        <button className={view.value === "list" ? "on" : ""} aria-pressed={view.value === "list"} onClick={() => view.onChange("list")} aria-label="List view"><List size={15} /></button>
      </div>}
      {search && <label className="glass global-search">
        <Search size={14} aria-hidden="true" />
        <input value={search.value} onChange={e => search.onChange(e.target.value)} placeholder="Search" aria-label="Search your library" />
        <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
      </label>}
      <button data-focus-fallback className="add-round" onClick={onAdd} aria-label="Add book" title={mac ? "Add Book (⌘N)" : "Add Book (Ctrl+N)"}><Plus size={17} /></button>
    </div>
  </header>;
}
