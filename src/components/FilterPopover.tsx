import { useEffect, useId, useRef, useState } from "react";
import { ChevronsUpDown, SlidersHorizontal } from "lucide-react";
import type { BookQuery, Collection } from "../types";
import { useDismiss } from "./Menu";

export const STATUSES = ["Want to Read", "Unread", "Reading", "Finished", "Did Not Finish"] as const;
export const FORMATS = ["Hardcover", "Paperback", "Mass Market Paperback", "Ebook", "Audiobook", "Other"] as const;
const RATINGS = [{ value: 0, label: "Any" }, { value: 3, label: "3+" }, { value: 4, label: "4+" }, { value: 5, label: "5" }];

export const activeFilterCount = (q: BookQuery) =>
  [q.status && q.status !== "All", q.format && q.format !== "All", q.minRating, q.collectionId].filter(Boolean).length;

/** Toolbar "Filter" capsule with a non-modal popover of native pop-up buttons (real OS menus). */
export function FilterPopover({ query, onQuery, collections, shown, total }: { query: BookQuery; onQuery: (q: BookQuery) => void; collections: Collection[]; shown: number; total: number }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), pop, trigger);
  useEffect(() => { if (open) pop.current?.querySelector<HTMLElement>("select")?.focus(); }, [open]);
  const count = activeFilterCount(query);
  const set = (patch: Partial<BookQuery>) => onQuery({ ...query, ...patch });
  return <div className="menu-anchor">
    <button ref={trigger} type="button" className={`glass capsule${count ? " is-active" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(o => !o)}>
      <SlidersHorizontal size={14} aria-hidden="true" /><span className="cap-label">{count ? `Filter · ${count}` : "Filter"}</span>{count > 0 && <span className="cap-count" aria-hidden="true">{count}</span>}
    </button>
    {open && <div ref={pop} id={id} role="dialog" aria-label="Filter books" className="mac-popover filter-pop">
      <div className="pop-head"><h2>Filter</h2>
        <button type="button" className="link-btn" disabled={!count} onClick={() => onQuery({ sort: query.sort, search: query.search })}>Reset</button></div>
      <div className="filter-grid">
        <label htmlFor={`${id}-status`}>Status</label>
        <span className="popup"><select id={`${id}-status`} value={query.status && query.status !== "All" ? query.status : ""} onChange={e => set({ status: e.target.value || undefined })}>
          <option value="">Any Status</option>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select><ChevronsUpDown size={12} aria-hidden="true" /></span>
        <label htmlFor={`${id}-format`}>Format</label>
        <span className="popup"><select id={`${id}-format`} value={query.format && query.format !== "All" ? query.format : ""} onChange={e => set({ format: e.target.value || undefined })}>
          <option value="">All Formats</option>{FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select><ChevronsUpDown size={12} aria-hidden="true" /></span>
        <span id={`${id}-rating`} className="filter-label">Rating</span>
        <div className="glass seg seg-sm seg-fill" role="group" aria-labelledby={`${id}-rating`}>
          {RATINGS.map(r => <button key={r.value} type="button" aria-pressed={(query.minRating ?? 0) === r.value} className={(query.minRating ?? 0) === r.value ? "on" : ""}
            aria-label={r.value ? `${r.label} stars` : "Any rating"} onClick={() => set({ minRating: r.value || undefined })}>{r.label}</button>)}
        </div>
        <label htmlFor={`${id}-collection`}>Collection</label>
        <span className="popup"><select id={`${id}-collection`} value={query.collectionId ?? ""} onChange={e => set({ collectionId: e.target.value ? Number(e.target.value) : undefined })}>
          <option value="">Any Collection</option>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select><ChevronsUpDown size={12} aria-hidden="true" /></span>
      </div>
      <p className="pop-foot" role="status">Showing {shown} of {total} {total === 1 ? "book" : "books"}</p>
    </div>}
  </div>;
}
