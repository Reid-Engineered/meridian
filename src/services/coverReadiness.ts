/** Browser image readiness is separate from resolving a stored cover reference. */
export class CoverReadiness {
  private ready = new Map<string, { src: string; image: HTMLImageElement }>();
  private jobs = new Map<string, { run: () => void; cancel: () => void; visible: boolean }>();
  private pending = new Map<string, Promise<string>>();
  private active = 0;
  private listeners = new Set<() => void>();
  private generation = 0;
  constructor(private resolve: (reference: string) => Promise<string>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  version = () => this.generation;
  peek(reference: string) {
    const entry = this.ready.get(reference);
    if (entry) { this.ready.delete(reference); this.ready.set(reference, entry); }
    return entry?.src;
  }
  load(reference: string, visible = true): Promise<string> {
    const cached = this.peek(reference);
    if (cached) return Promise.resolve(cached);
    const existing = this.pending.get(reference);
    if (existing) {
      const job = this.jobs.get(reference);
      if (job && visible) job.visible = true;
      return existing;
    }
    const generation = this.generation;
    const promise = new Promise<string>((resolve, reject) => {
      this.jobs.set(reference, {
        visible,
        cancel: () => reject(new Error('Cover preload invalidated')),
        run: () => {
          this.active++;
          this.resolve(reference).then(async src => {
            const image = new Image();
            // Retain the decoded image while it is in the bounded ready cache.
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
              const decoded = typeof image.decode === 'function'
                ? (image.src = src, image.decode())
                : new Promise<void>((loaded, failed) => {
                  image.onload = () => loaded(); image.onerror = () => failed(new Error('Cover unavailable')); image.src = src;
                });
              await Promise.race([decoded, new Promise<never>((_, failed) => {
                timer = setTimeout(() => failed(new Error('Cover load timed out')), 15000);
              })]);
            } catch (error) { image.src = ''; throw error; }
            finally { clearTimeout(timer); image.onload = null; image.onerror = null; }
            if (generation !== this.generation) throw new Error('Cover preload invalidated');
            this.ready.set(reference, { src, image });
            if (this.ready.size > 64) this.ready.delete(this.ready.keys().next().value!);
            return src;
          }).then(resolve, reject).finally(() => { this.active--; this.pump(); });
        },
      });
    });
    this.pending.set(reference, promise);
    const forget = () => { if (this.pending.get(reference) === promise) this.pending.delete(reference); };
    promise.then(forget, forget);
    this.pump();
    return promise;
  }
  private pump() {
    while (this.active < 4 && this.jobs.size) {
      const next = [...this.jobs].find(([, job]) => job.visible) ?? this.jobs.entries().next().value!;
      this.jobs.delete(next[0]); next[1].run();
    }
  }
  preload(references: (string | null | undefined)[]) {
    // Bound speculative work even when a caller supplies an entire large catalog.
    for (const reference of [...new Set(references.filter((r): r is string => !!r))].slice(0, 48)) {
      if (this.jobs.size >= 48) break;
      void this.load(reference, false).catch(() => {});
    }
  }
  clear() {
    this.generation++; this.ready.clear(); this.pending.clear();
    for (const job of this.jobs.values()) job.cancel();
    this.jobs.clear();
    for (const listener of this.listeners) listener();
  }
  forget(reference: string) { this.ready.delete(reference); }
}
