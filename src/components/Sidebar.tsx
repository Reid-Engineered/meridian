import { BarChart3, BookOpen, Bookmark, CircleCheck, CirclePause, Folder, LayoutGrid, LibraryBig, Settings, type LucideIcon } from "lucide-react";
import type { BookDetail, Collection, ReadingStatus } from "../types";
import { CoverImage } from "./CoverImage";

export type Page = "library"|"collections"|"reading"|"statistics"|"settings";
/** What the Library page is showing. Status and collection scopes map onto the existing BookQuery filters. */
export type Scope = { kind: "all" } | { kind: "status"; status: ReadingStatus } | { kind: "collection"; id: number };

const statusRows: { status: ReadingStatus; label: string; icon: LucideIcon }[] = [
  { status: "Want to Read", label: "Want to Read", icon: Bookmark },
  { status: "Finished", label: "Finished", icon: CircleCheck },
  { status: "Did Not Finish", label: "Did Not Finish", icon: CirclePause },
];

type Props = {
  page: Page; scope: Scope; total: number; statusCounts: Partial<Record<ReadingStatus, number>>;
  collections: Collection[]; nowReading?: BookDetail;
  onNavigate: (page: Page, scope?: Scope) => void; onOpenBook: (book: BookDetail) => void;
};

function Row({ icon: Icon, label, count, active, muted, keep, onClick }: { icon: LucideIcon; label: string; count?: number; active: boolean; muted?: boolean; keep?: boolean; onClick: () => void }) {
  return <button className={`sb-row${active ? " active" : ""}${muted ? " muted-icon" : ""}${keep ? " sb-keep" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
    <Icon size={16} aria-hidden="true" /><span className="sb-label">{label}</span>{count !== undefined && <span className="sb-count">{count}</span>}
  </button>;
}

export function Sidebar({ page, scope, total, statusCounts, collections, nowReading, onNavigate, onOpenBook }: Props) {
  const inLibrary = page === "library";
  const progress = nowReading?.pageCount && nowReading.currentPage ? Math.round(nowReading.currentPage / nowReading.pageCount * 100) : 0;
  return <aside className="mac-sidebar" aria-label="Sidebar">
    <div className="traffic-space" aria-hidden="true" data-tauri-drag-region />
    <div className="sidebar-brand">
      <img className="sidebar-logo-light" src="/brand/meridian-logo.svg" alt="Meridian" width="158" height="43"/>
      <img className="sidebar-logo-dark" src="/brand/meridian-logo-dark.svg" alt="Meridian" width="158" height="43"/>
    </div>
    <nav aria-label="Library">
      <Row icon={LibraryBig} label="All Books" count={total} active={inLibrary && scope.kind === "all"} onClick={() => onNavigate("library", { kind: "all" })} />
      <Row icon={BookOpen} label="Reading Now" count={statusCounts.Reading ?? 0} active={page === "reading"} onClick={() => onNavigate("reading")} />
      {statusRows.map(r => <Row key={r.status} icon={r.icon} label={r.label} count={statusCounts[r.status] ?? 0}
        active={inLibrary && scope.kind === "status" && scope.status === r.status} onClick={() => onNavigate("library", { kind: "status", status: r.status })} />)}
      <Row icon={BarChart3} label="Statistics" active={page === "statistics"} onClick={() => onNavigate("statistics")} />
    </nav>
    <nav aria-label="Collections" className="sb-section">
      <p className="sb-heading">Collections</p>
      <Row icon={LayoutGrid} label="All Collections" keep count={collections.length} muted active={page === "collections"} onClick={() => onNavigate("collections")} />
      {collections.map(c => <Row key={c.id} icon={Folder} label={c.name} count={c.bookCount} muted
        active={inLibrary && scope.kind === "collection" && scope.id === c.id} onClick={() => onNavigate("library", { kind: "collection", id: c.id })} />)}
    </nav>
    <div className="sb-footer">
      {nowReading && <button className="sb-now" onClick={() => onOpenBook(nowReading)} aria-label={`Continue ${nowReading.title}, ${progress}% read`}>
        <span className="sb-now-cover">{nowReading.coverUrl ? <CoverImage reference={nowReading.coverUrl} alt="" /> : <i />}</span>
        <span className="sb-now-copy"><strong>{nowReading.title}</strong>
          <small>{nowReading.pageCount ? `Page ${nowReading.currentPage ?? 0} of ${nowReading.pageCount}` : "Reading"}</small>
          <span className="meter" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span></span>
      </button>}
      <Row icon={Settings} label="Settings" muted active={page === "settings"} onClick={() => onNavigate("settings")} />
    </div>
  </aside>;
}
