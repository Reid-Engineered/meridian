import { ArrowUpDown, Plus, Search, X } from "lucide-react";
import type { BookDetail, BookQuery, Collection } from "../types";
import { BookCard, Cover, Stars, progressOf, statusClass } from "../components/BookCard";
import { activeFilterCount, FilterPopover } from "../components/FilterPopover";
import { MenuButton } from "../components/Menu";
import { LibrarySearch } from "../components/LibrarySearch";
import { ViewToggle } from "../components/Toolbar";

const FIELDS = [
  { value: "date_added", label: "Date Added", dir: "desc" }, { value: "title", label: "Title", dir: "asc" }, { value: "author", label: "Author", dir: "asc" },
  { value: "publication_year", label: "Publication Year", dir: "desc" }, { value: "rating", label: "Rating", dir: "desc" },
] as const;
type Field = typeof FIELDS[number]["value"];
export function parseSort(sort = "date_added_desc"): { field: Field; dir: "asc" | "desc" } {
  const m = /^(title|author|publication_year|rating|date_added)_(asc|desc)$/.exec(sort);
  return m ? { field: m[1] as Field, dir: m[2] as "asc" | "desc" } : { field: "date_added", dir: "desc" };
}
const sortLabel = (sort?: string) => { const { field, dir } = parseSort(sort); return field === "date_added" && dir === "desc" ? "Recently Added" : FIELDS.find(f => f.value === field)!.label; };
const formatAdded = (d: string) => { const [y, m, day] = d.split("-").map(Number); return y ? new Date(y, m - 1, day).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : d; };

/** Toolbar controls for the Library: view, filter, sort, search. */
export function LibraryToolbarActions({ query, onQuery, view, onView, collections, shown, total, allBooks, onOpen }: {
  query: BookQuery; onQuery: (q: BookQuery) => void; view: "grid" | "list"; onView: (v: "grid" | "list") => void;
  collections: Collection[]; shown: number; total: number; allBooks: BookDetail[]; onOpen: (b: BookDetail) => void;
}) {
  const { field, dir } = parseSort(query.sort);
  return <>
    <ViewToggle value={view} onChange={onView} />
    <FilterPopover query={query} onQuery={onQuery} collections={collections} shown={shown} total={total} />
    <MenuButton<string> menuLabel="Sort books" align="end" icon={<ArrowUpDown size={14} aria-hidden="true" />} label={sortLabel(query.sort)} groups={[
      { label: "Sort By", items: FIELDS.map(f => ({ value: f.value, label: f.label })), selected: field,
        onSelect: v => onQuery({ ...query, sort: `${v}_${FIELDS.find(f => f.value === v)!.dir}` }) },
      { label: "Order", items: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }], selected: dir,
        onSelect: v => onQuery({ ...query, sort: `${field}_${v}` }) },
    ]} />
    <LibrarySearch value={query.search || ""} onChange={s => onQuery({ ...query, search: s })} books={allBooks} onOpenBook={onOpen} />
  </>;
}

type Props = { books: BookDetail[]; allBooks: BookDetail[]; query: BookQuery; onQuery: (q: BookQuery) => void; onOpen: (b: BookDetail) => void;
  view: "grid" | "list"; loading: boolean; selectedId?: number; collections: Collection[]; onAdd: () => void };

export function LibraryPage({ books, allBooks, query, onQuery, onOpen, view, loading, selectedId, collections, onAdd }: Props) {
  const filters = activeFilterCount(query);
  const searching = !!query.search?.trim();
  const clear = () => onQuery({ sort: query.sort });
  const chips: { label: string; remove: () => void }[] = [];
  if (query.status && query.status !== "All") chips.push({ label: `Status: ${query.status}`, remove: () => onQuery({ ...query, status: undefined }) });
  if (query.format && query.format !== "All") chips.push({ label: `Format: ${query.format}`, remove: () => onQuery({ ...query, format: undefined }) });
  if (query.minRating) chips.push({ label: `Rating: ${query.minRating === 5 ? "5 stars" : `${query.minRating}+ stars`}`, remove: () => onQuery({ ...query, minRating: undefined }) });
  if (query.collectionId) chips.push({ label: `Collection: ${collections.find(c => c.id === query.collectionId)?.name ?? "Unknown"}`, remove: () => onQuery({ ...query, collectionId: undefined }) });
  const reading = !filters && !searching ? allBooks.filter(b => b.status === "Reading").sort((a, b) => (b.dateStarted ?? "").localeCompare(a.dateStarted ?? "")).slice(0, 2) : [];

  if (!loading && allBooks.length === 0) return <div className="page library-page lib-empty">
    <div className="lib-shelf" aria-hidden="true"><i /><i /><i /></div>
    <h2>Your shelves are waiting</h2>
    <p>Add your first book by its ISBN and Meridian fills in the cover and details. Everything stays on this computer.</p>
    <button className="btn primary lg" onClick={onAdd}><Plus size={15} />Add Book</button>
    <p className="faint">Tip: press {navigator.platform.includes("Mac") ? "⌘N" : "Ctrl+N"} anywhere to add a book.</p>
  </div>;

  return <div className="page library-page">
    {(chips.length > 0 || searching) && <div className="lib-chips" role="group" aria-label="Active filters">
      <span className="faint">Showing</span>
      {searching && <span className="chip">“{query.search}”<button type="button" aria-label="Clear search" onClick={() => onQuery({ ...query, search: "" })}><X size={11} /></button></span>}
      {chips.map(c => <span key={c.label} className="chip">{c.label}<button type="button" aria-label={`Remove filter ${c.label}`} onClick={c.remove}><X size={11} /></button></span>)}
      <button type="button" className="link-btn" onClick={() => onQuery({ sort: query.sort })}>Clear All</button>
    </div>}

    {reading.length > 0 && <section aria-labelledby="continue-h" className="lib-section">
      <h2 id="continue-h" className="lib-h2">Continue Reading</h2>
      <div className="lib-continue">{reading.map(b => <button key={b.id} type="button" className="lib-continue-card" onClick={() => onOpen(b)} aria-label={`Continue ${b.title}, ${progressOf(b)}% read`}>
        <Cover book={b} />
        <span className="lib-continue-copy"><strong className="serif-title">{b.title}</strong><small>{b.authors.join(", ")}</small>
          {b.pageCount ? <><span className="meter"><i style={{ width: `${progressOf(b)}%` }} /></span><span className="lib-continue-meta"><span>Page {b.currentPage ?? 0} of {b.pageCount}</span><span>{progressOf(b)}%</span></span></> : <small>Reading</small>}
        </span>
      </button>)}</div>
    </section>}

    {loading ? <div className="lib-grid" aria-busy="true">{Array.from({ length: 10 }).map((_, i) => <div className="lib-skeleton" key={i}><i /><span /><small /></div>)}</div>
    : books.length === 0 ? <section className="lib-noresults">
        <Search size={40} aria-hidden="true" />
        <h2>{searching ? `No books match “${query.search}”` : "No books match these filters"}</h2>
        <p>{searching ? "Check the spelling, or clear the filters to search your whole library." : "Try removing a filter to see more of your library."}</p>
        <div><button className="btn secondary" onClick={clear}>Clear Filters</button><button className="btn secondary" onClick={onAdd}><Plus size={14} />Add a Book…</button></div>
      </section>
    : <section aria-labelledby="library-h" className="lib-section">
        {reading.length > 0 && <h2 id="library-h" className="lib-h2">Library</h2>}
        {reading.length === 0 && <h2 id="library-h" className="sr-only">Books</h2>}
        {view === "grid"
          ? <div className="lib-grid">{books.map(b => <BookCard key={b.id} book={b} onOpen={() => onOpen(b)} selected={b.id === selectedId} />)}</div>
          : <div className="lib-table-wrap"><table className="lib-table">
              <thead><tr><th scope="col">Title</th><th scope="col">Author</th><th scope="col">Status</th><th scope="col">Rating</th><th scope="col">Format</th><th scope="col" className="num">Published</th><th scope="col" className="num col-added">Added</th></tr></thead>
              <tbody>{books.map(b => <tr key={b.id} className={b.id === selectedId ? "is-selected" : ""} onClick={() => onOpen(b)}>
                <td><span className="lib-row-title"><Cover book={b} className="lib-thumb" /><span><button type="button" className="row-open" aria-label={`Open ${b.title}`} aria-current={b.id === selectedId || undefined} onClick={e => { e.stopPropagation(); onOpen(b); }}>{b.title}</button>
                  {(b.subtitle || b.series) && <small>{b.series ? `${b.series}${b.seriesPosition ? ` · Book ${b.seriesPosition}` : ""}` : b.subtitle}</small>}</span></span></td>
                <td className="muted">{b.authors.join(", ") || "—"}</td>
                <td><span className="lib-status"><span className={`status-dot ${statusClass(b.status)}`} />{b.status}</span></td>
                <td>{b.rating ? <Stars value={b.rating} /> : <span className="faint">—</span>}</td>
                <td className="muted">{b.format}</td>
                <td className="muted num">{b.publicationYear ?? "—"}</td>
                <td className="muted num col-added">{formatAdded(b.dateAdded)}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>}
  </div>;
}
