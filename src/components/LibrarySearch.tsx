import { useId, useMemo, useRef, useState } from "react";
import { Search, User, X } from "lucide-react";
import type { BookDetail } from "../types";
import { useDismiss } from "./Menu";

type Suggestion = { kind: "book"; book: BookDetail } | { kind: "author"; name: string; count: number };
const mac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

/** Toolbar search that filters as you type and suggests matching books and authors (combobox + listbox). */
export function LibrarySearch({ value, onChange, books, onOpenBook }: { value: string; onChange: (s: string) => void; books: BookDetail[]; onOpenBook: (b: BookDetail) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const box = useRef<HTMLLabelElement>(null), list = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), list, box);
  const suggestions = useMemo<Suggestion[]>(() => {
    const term = value.trim().toLocaleLowerCase();
    if (term.length < 2) return [];
    const bookHits = books.filter(b => b.title.toLocaleLowerCase().includes(term) || b.authors.some(a => a.toLocaleLowerCase().includes(term))).slice(0, 4);
    const authors = new Map<string, number>();
    books.forEach(b => b.authors.forEach(a => { if (a.toLocaleLowerCase().includes(term)) authors.set(a, (authors.get(a) ?? 0) + 1); }));
    return [...bookHits.map(book => ({ kind: "book" as const, book })), ...[...authors].slice(0, 3).map(([name, count]) => ({ kind: "author" as const, name, count }))];
  }, [value, books]);
  const shown = open && suggestions.length > 0;
  const choose = (s: Suggestion) => {
    setOpen(false); setActive(-1);
    if (s.kind === "book") onOpenBook(s.book); else onChange(s.name);
  };
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length) { e.preventDefault(); setOpen(true); setActive(a => (a + 1) % suggestions.length); }
    else if (e.key === "ArrowUp" && shown) { e.preventDefault(); setActive(a => (a <= 0 ? suggestions.length : a) - 1); }
    else if (e.key === "Enter" && shown && active >= 0) { e.preventDefault(); choose(suggestions[active]); }
    else if (e.key === "Escape" && shown) { e.preventDefault(); e.stopPropagation(); setOpen(false); setActive(-1); }
  };
  const optionId = (i: number) => `${id}-opt-${i}`;
  const firstAuthor = suggestions.findIndex(s => s.kind === "author");
  return <div className="menu-anchor">
    <label ref={box} className="glass global-search">
      <Search size={14} aria-hidden="true" />
      <input value={value} placeholder="Search" aria-label="Search your library" role="combobox" aria-autocomplete="list"
        aria-expanded={shown} aria-controls={shown ? `${id}-list` : undefined} aria-activedescendant={shown && active >= 0 ? optionId(active) : undefined}
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKey} />
      {value ? <button type="button" className="clear-btn" aria-label="Clear search" onClick={() => { onChange(""); setOpen(false); }}><X size={12} /></button>
        : <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>}
    </label>
    {shown && <div ref={list} id={`${id}-list`} role="listbox" aria-label="Suggestions" className="mac-menu align-end suggest">
      {suggestions[0]?.kind === "book" && <div className="menu-head" aria-hidden="true">Books</div>}
      {suggestions.map((s, i) => <div key={s.kind === "book" ? `b${s.book.id}` : `a${s.name}`}>
        {i === firstAuthor && <>{i > 0 && <div className="menu-sep" role="separator" />}<div className="menu-head" aria-hidden="true">Authors</div></>}
        <div id={optionId(i)} role="option" aria-selected={i === active} className={`menu-item suggest-item${i === active ? " is-active" : ""}`}
          onMouseDown={e => e.preventDefault()} onClick={() => choose(s)} onMouseEnter={() => setActive(i)}>
          {s.kind === "book" ? <>
            <span className="suggest-copy"><strong>{s.book.title}</strong><small>{s.book.authors.join(", ") || "Unknown author"} · {s.book.status}</small></span>
          </> : <><User size={14} aria-hidden="true" /><span>{s.name}</span><span className="menu-key">{s.count} {s.count === 1 ? "book" : "books"}</span></>}
        </div>
      </div>)}
    </div>}
  </div>;
}
