import type { ReactNode } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";

const mac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

/** Unified window toolbar: title on the left; page actions, then Add, on the right. */
export function Toolbar({ title, subtitle, children, onAdd }: { title: string; subtitle?: string; children?: ReactNode; onAdd: () => void }) {
  return <header className="mac-toolbar" data-tauri-drag-region>
    <div className="tb-title" data-tauri-drag-region><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    <div className="tb-actions">
      {children}
      <button data-focus-fallback className="add-round" onClick={onAdd} aria-label="Add book" title={mac ? "Add Book (⌘N)" : "Add Book (Ctrl+N)"}><Plus size={17} /></button>
    </div>
  </header>;
}

export function ViewToggle({ value, onChange }: { value: "grid" | "list"; onChange: (v: "grid" | "list") => void }) {
  return <div className="glass seg" role="group" aria-label="View">
    <button className={value === "grid" ? "on" : ""} aria-pressed={value === "grid"} onClick={() => onChange("grid")} aria-label="Grid view"><LayoutGrid size={15} /></button>
    <button className={value === "list" ? "on" : ""} aria-pressed={value === "list"} onClick={() => onChange("list")} aria-label="List view"><List size={15} /></button>
  </div>;
}
