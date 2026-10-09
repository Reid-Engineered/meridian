import { useEffect, useLayoutEffect, useRef } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { BookDetail } from "../types";
import { CoverImage } from "./CoverImage";
import { Stars } from "./BookCard";

/** "2026-08-20" → "Aug 20, 2026"; leaves anything else untouched. */
const formatDate = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

/**
 * Non-modal detail panel beside the library (replaces the modal drawer).
 * Escape or Close returns focus to whatever opened the book.
 */
export function BookInspector({ book, onClose, onEdit, onDelete }: { book: BookDetail; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const root = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && !root.current?.contains(active)) opener.current = active;
  }, [book.id]);
  useEffect(() => { root.current?.scrollTo?.({ top: 0 }); }, [book.id]);
  const close = () => {
    const target = opener.current;
    if (target?.isConnected && !target.closest("[inert]") && !root.current?.contains(target)) target.focus();
    else document.querySelector<HTMLElement>("[data-focus-fallback]")?.focus();
    onClose();
  };
  // Escape closes the inspector wherever focus is (it is non-modal), unless a modal layer is open:
  // useModalFocus handles Escape for those in the capture phase and stops it first.
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  const progress = book.pageCount && book.currentPage ? Math.round(book.currentPage / book.pageCount * 100) : 0;
  const published = [book.publicationYear, book.publisher].filter(Boolean).join(" · ");
  const facts: [string, string | number | null | undefined][] = [
    ["Format", book.format], ["Published", published], ["Pages", book.pageCount], ["Language", book.language],
    ["ISBN", book.isbn13 || book.isbn10], ["Condition", book.condition], ["Shelf", book.location], ["Acquired", formatDate(book.dateAcquired)],
    ["Started", formatDate(book.dateStarted)], ["Finished", formatDate(book.dateFinished)],
  ];
  return <aside ref={root} className="mac-inspector" aria-label={`${book.title} details`}>
    <button className="glass round insp-close" onClick={close} aria-label="Close"><X size={14} /></button>
    <div className="insp-cover">{book.coverUrl ? <CoverImage reference={book.coverUrl} alt={`Cover of ${book.title}`} /> : <div className="cover-placeholder"><span>{book.title}</span></div>}</div>
    <div className="insp-head">
      <h2>{book.title}</h2>
      {book.subtitle && <p className="insp-sub">{book.subtitle}</p>}
      <p className="insp-authors">{book.authors.join(", ") || "Unknown author"}</p>
      {book.series && <p className="insp-sub">{book.series}{book.seriesPosition ? ` · Book ${book.seriesPosition}` : ""}</p>}
      {!!book.rating && <Stars value={book.rating} />}
    </div>
    {book.status === "Reading" && !!book.pageCount && <section className="insp-progress" aria-label="Reading progress">
      <div><strong>{progress}%</strong><span>Page {book.currentPage ?? 0} of {book.pageCount}</span></div>
      <span className="meter"><i style={{ width: `${progress}%` }} /></span>
    </section>}
    <div className="insp-actions">
      <button className="btn primary" onClick={onEdit}><Pencil size={14} />Edit book</button>
      <button className="btn secondary" onClick={onDelete} aria-label="Remove from library"><Trash2 size={14} />Remove…</button>
    </div>
    <p className="insp-status"><span className={`status-dot s-${book.status.toLowerCase().replace(/ /g, "-")}`} />{book.status}</p>
    <dl className="insp-group">{facts.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    {book.tags.length > 0 && <div className="insp-tags" aria-label="Tags">{book.tags.map(t => <span key={t}>{t}</span>)}</div>}
    {book.description && <section className="insp-text"><h3>About this book</h3><p>{book.description}</p></section>}
    {book.review && <section className="insp-text"><h3>My review</h3><p className="serif-note">{book.review}</p></section>}
    {book.notes && <section className="insp-text"><h3>Notes</h3><p className="serif-note">{book.notes}</p></section>}
  </aside>;
}
