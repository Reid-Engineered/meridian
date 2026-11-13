import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronsUpDown, Eye, RotateCw, Shuffle, Sparkles, X } from "lucide-react";
import type { BookDetail, Collection } from "../types";
import { CoverImage } from "../components/CoverImage";
import { PieWheel, computeNextSpinRotation, sliceColor } from "../components/PieWheel";
import { Stars, statusClass } from "../components/BookCard";

export type WheelStatusFilter = "to-read" | "Want to Read" | "Unread" | "Reading" | "Finished" | "all";

const STATUS_OPTIONS: { value: WheelStatusFilter; label: string }[] = [
  { value: "to-read", label: "To Read" },
  { value: "Want to Read", label: "Want to Read" },
  { value: "Unread", label: "Unread" },
  { value: "Reading", label: "Reading" },
  { value: "Finished", label: "Finished" },
  { value: "all", label: "All Books" },
];

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 1) return 0;
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    let x = 0;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function randomFraction(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 0x100000000;
  }
  return Math.random();
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Props = {
  books: BookDetail[];
  collections: Collection[];
  onOpenBook: (book: BookDetail) => void;
  onStartReading?: (book: BookDetail) => Promise<void>;
  /** Override spin animation length (useful in tests). */
  spinDurationMs?: number;
};

export function WheelPage({ books, collections, onOpenBook, onStartReading, spinDurationMs = 3600 }: Props) {
  const [statusFilter, setStatusFilter] = useState<WheelStatusFilter>(() =>
    books.some(b => b.status === "Want to Read" || b.status === "Unread") ? "to-read" : "all"
  );
  const [collectionId, setCollectionId] = useState<number | undefined>(undefined);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(() => new Set());
  const [orderIds, setOrderIds] = useState<number[]>(() => books.map(b => b.id));
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const spinTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimer.current !== null) window.clearTimeout(spinTimer.current);
    };
  }, []);

  // Keep custom slice order synchronized when books are added or removed.
  useEffect(() => {
    setOrderIds(prev => {
      const present = new Set(books.map(b => b.id));
      const kept = prev.filter(id => present.has(id));
      const keptSet = new Set(kept);
      const added = books.filter(b => !keptSet.has(b.id)).map(b => b.id);
      if (added.length === 0 && kept.length === prev.length) return prev;
      return [...kept, ...added];
    });
  }, [books]);

  const cancelSpin = () => {
    if (spinTimer.current !== null) {
      window.clearTimeout(spinTimer.current);
      spinTimer.current = null;
    }
    setSpinning(false);
  };

  const filteredBooks = useMemo(() => {
    const byId = new Map(books.map(b => [b.id, b]));
    const ordered = orderIds.map(id => byId.get(id)).filter((b): b is BookDetail => !!b);
    return ordered.filter(b => {
      if (statusFilter === "to-read" && b.status !== "Want to Read" && b.status !== "Unread") return false;
      if (statusFilter !== "to-read" && statusFilter !== "all" && b.status !== statusFilter) return false;
      if (collectionId !== undefined && !b.collectionIds.includes(collectionId)) return false;
      return true;
    });
  }, [books, orderIds, statusFilter, collectionId]);

  const activeBooks = useMemo(
    () => filteredBooks.filter(b => !excludedIds.has(b.id)),
    [filteredBooks, excludedIds]
  );

  const slices = useMemo(
    () => activeBooks.map(b => ({ id: b.id, label: b.title, sublabel: b.authors.join(", ") })),
    [activeBooks]
  );

  const winner = useMemo(
    () => (winnerId !== null ? books.find(b => b.id === winnerId) ?? null : null),
    [books, winnerId]
  );

  const winnerIndex = useMemo(
    () => (winnerId !== null ? activeBooks.findIndex(b => b.id === winnerId) : -1),
    [activeBooks, winnerId]
  );

  const sliceIndexById = useMemo(
    () => new Map(activeBooks.map((b, i) => [b.id, i])),
    [activeBooks]
  );

  const spinWithCandidates = (candidates: BookDetail[]) => {
    if (spinning || candidates.length === 0) return;
    const chosenIdx = randomInt(candidates.length);
    const chosen = candidates[chosenIdx];
    const nextRotation = computeNextSpinRotation(rotation, chosenIdx, candidates.length, 6, randomFraction());
    const duration = prefersReducedMotion() ? 0 : spinDurationMs;

    setRotation(nextRotation);
    if (duration <= 0) {
      setSpinning(false);
      setWinnerId(chosen.id);
      return;
    }

    setSpinning(true);
    setWinnerId(null);
    spinTimer.current = window.setTimeout(() => {
      spinTimer.current = null;
      setSpinning(false);
      setWinnerId(chosen.id);
    }, duration);
  };

  const handleSpin = () => spinWithCandidates(activeBooks);

  const handleExcludeAndSpin = () => {
    if (!winner || spinning) return;
    const nextExcluded = new Set(excludedIds);
    nextExcluded.add(winner.id);
    setExcludedIds(nextExcluded);
    const remaining = filteredBooks.filter(b => !nextExcluded.has(b.id));
    if (remaining.length > 0) {
      spinWithCandidates(remaining);
    } else {
      setWinnerId(null);
    }
  };

  const toggleBook = (id: number) => {
    if (spinning) return;
    if (id === winnerId && !excludedIds.has(id)) {
      setWinnerId(null);
    }
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (spinning) return;
    setExcludedIds(prev => {
      const next = new Set(prev);
      filteredBooks.forEach(b => next.delete(b.id));
      return next;
    });
  };

  const clearAll = () => {
    if (spinning) return;
    setExcludedIds(prev => {
      const next = new Set(prev);
      filteredBooks.forEach(b => next.add(b.id));
      return next;
    });
    setWinnerId(null);
  };

  const sampleTwelve = () => {
    if (spinning || filteredBooks.length <= 12) return;
    const pool = [...filteredBooks];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = new Set(pool.slice(0, 12).map(b => b.id));
    setExcludedIds(prev => {
      const next = new Set(prev);
      filteredBooks.forEach(b => {
        if (chosen.has(b.id)) next.delete(b.id);
        else next.add(b.id);
      });
      return next;
    });
    setWinnerId(null);
  };

  const shuffleSlices = () => {
    if (spinning) return;
    setWinnerId(null);
    setOrderIds(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const changeStatus = (next: WheelStatusFilter) => {
    cancelSpin();
    setStatusFilter(next);
    setWinnerId(null);
  };

  const changeCollection = (nextId?: number) => {
    cancelSpin();
    setCollectionId(nextId);
    setWinnerId(null);
  };

  const handleStartReading = async () => {
    if (!winner || !onStartReading || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await onStartReading(winner);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="page wheel-page">
      <div className="wheel-controls" role="region" aria-label="Wheel filters">
        <div className="glass seg seg-sm wheel-status-seg" role="group" aria-label="Book status filter">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={statusFilter === opt.value ? "on" : ""}
              aria-pressed={statusFilter === opt.value}
              onClick={() => changeStatus(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="wheel-collection-select">
          <span className="sr-only">Collection</span>
          <span className="popup">
            <select
              aria-label="Filter wheel by collection"
              value={collectionId ?? ""}
              onChange={e => changeCollection(e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">All Collections</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronsUpDown size={12} aria-hidden="true" />
          </span>
        </label>

        <button
          type="button"
          className="glass capsule"
          onClick={shuffleSlices}
          disabled={spinning || activeBooks.length < 2}
        >
          <Shuffle size={14} aria-hidden="true" />
          <span>Shuffle</span>
        </button>
      </div>

      <div className="wheel-layout">
        <section className="wheel-stage" aria-label="Book pie wheel">
          {books.length === 0 ? (
            <div className="wheel-empty-card">
              <Sparkles size={32} aria-hidden="true" />
              <h2>Your library is empty</h2>
              <p>Add a few books to your library, then spin the wheel to pick your next read.</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="wheel-empty-card">
              <Sparkles size={32} aria-hidden="true" />
              <h2>No books match these filters</h2>
              <p>Try widening the status or collection filter to put books onto the wheel.</p>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setStatusFilter("all");
                  setCollectionId(undefined);
                }}
              >
                Show All Books
              </button>
            </div>
          ) : (
            <>
              <PieWheel
                items={slices}
                rotation={rotation}
                spinning={spinning}
                spinDurationMs={spinDurationMs}
                winnerIndex={winnerIndex >= 0 ? winnerIndex : null}
                onSpin={handleSpin}
              />

              <div className="wheel-stage-actions">
                <button
                  type="button"
                  className="btn primary lg"
                  onClick={handleSpin}
                  disabled={spinning || activeBooks.length === 0}
                >
                  <RotateCw size={15} aria-hidden="true" className={spinning ? "spin-icon" : ""} />
                  {spinning ? "Spinning\u2026" : winner ? "Spin Again" : "Spin the Wheel"}
                </button>
                <p className="wheel-live" role="status" aria-live="polite">
                  {spinning
                    ? `Spinning across ${activeBooks.length} ${activeBooks.length === 1 ? "book" : "books"}\u2026`
                    : activeBooks.length === 0
                      ? "Select at least one book from the list to spin."
                      : winner
                        ? `Selected: ${winner.title}`
                        : `${activeBooks.length} ${activeBooks.length === 1 ? "book" : "books"} ready on the wheel`}
                </p>
              </div>
            </>
          )}
        </section>

        <aside className="wheel-sidebar" aria-label="Selection and book pool">
          {winner && (
            <section className="wheel-result-card" aria-label="Selected book">
              <div className="wheel-result-kicker">
                <Sparkles size={13} aria-hidden="true" />
                <span>The wheel chose</span>
              </div>
              <div className="wheel-result-hero">
                <div className="wheel-result-cover">
                  {winner.coverUrl ? (
                    <CoverImage reference={winner.coverUrl} alt={`Cover of ${winner.title}`} eager />
                  ) : (
                    <div className="cover-placeholder">
                      <span>{winner.title}</span>
                    </div>
                  )}
                </div>
                <div className="wheel-result-copy">
                  <h3>{winner.title}</h3>
                  <p className="wheel-result-authors">{winner.authors.join(", ") || "Unknown author"}</p>
                  <div className="wheel-result-meta">
                    <span className="lib-status">
                      <span className={`status-dot ${statusClass(winner.status)}`} />
                      {winner.status}
                    </span>
                    {winner.pageCount ? <span>{winner.pageCount} pages</span> : null}
                    {winner.rating ? <Stars value={winner.rating} /> : null}
                  </div>
                </div>
              </div>
              <div className="wheel-result-actions">
                <button type="button" className="btn primary" onClick={() => onOpenBook(winner)}>
                  <Eye size={14} aria-hidden="true" />
                  View Details
                </button>
                {winner.status !== "Reading" && onStartReading && (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={handleStartReading}
                    disabled={updatingStatus}
                  >
                    <BookOpen size={14} aria-hidden="true" />
                    {updatingStatus ? "Updating\u2026" : "Start Reading"}
                  </button>
                )}
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleExcludeAndSpin}
                  disabled={spinning}
                >
                  <X size={14} aria-hidden="true" />
                  {activeBooks.length > 1 ? "Exclude & Spin" : "Exclude"}
                </button>
              </div>
            </section>
          )}

          <section className="wheel-pool-card" aria-label="Books on wheel">
            <header className="wheel-pool-head">
              <div>
                <h3>Books on wheel</h3>
                <small>{activeBooks.length} of {filteredBooks.length} included</small>
              </div>
              <div className="wheel-pool-tools">
                {filteredBooks.length > 12 && (
                  <button type="button" className="link-btn" onClick={sampleTwelve} disabled={spinning}>
                    Random 12
                  </button>
                )}
                <button
                  type="button"
                  className="link-btn"
                  onClick={selectAll}
                  disabled={spinning || activeBooks.length === filteredBooks.length}
                >
                  All
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={clearAll}
                  disabled={spinning || activeBooks.length === 0}
                >
                  None
                </button>
              </div>
            </header>

            <ul className="wheel-pool-list">
              {filteredBooks.map(book => {
                const sliceIdx = sliceIndexById.get(book.id);
                const included = sliceIdx !== undefined;
                const swatch = included ? sliceColor(sliceIdx, activeBooks.length) : undefined;
                const isWinner = winner?.id === book.id && !spinning;
                return (
                  <li key={book.id} className={isWinner ? "is-winner" : undefined}>
                    <button
                      type="button"
                      className={`wheel-pool-item${included ? " is-included" : ""}`}
                      aria-pressed={included}
                      onClick={() => toggleBook(book.id)}
                      disabled={spinning}
                    >
                      <span
                        className="wheel-swatch"
                        style={swatch ? { backgroundColor: swatch.bg, color: swatch.fg } : undefined}
                        aria-hidden="true"
                      >
                        {included && <Check size={10} />}
                      </span>
                      <span className="wheel-pool-copy">
                        <strong>{book.title}</strong>
                        <small>{book.authors.join(", ") || "Unknown author"}</small>
                      </span>
                      <span className="wheel-pool-status">{book.status}</span>
                    </button>
                  </li>
                );
              })}
              {filteredBooks.length === 0 && (
                <li className="wheel-pool-empty">No books match the current filters.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
