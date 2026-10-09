import { useEffect, useState } from "react";
import { windowService } from "../services/window";

/** Windows caption controls; macOS retains its real system traffic lights. */
export function WindowChrome() {
  const [maximized, setMaximized] = useState(false);
  const [error, setError] = useState("");
  const enabled = windowService.hasCustomChrome();
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    const refresh = () => { void windowService.isMaximized().then(value => { if (active) setMaximized(value); }).catch(() => {}); };
    refresh();
    void windowService.onResize(refresh).then(stop => { if (active) unlisten = stop; else stop(); }).catch(() => {});
    return () => { active = false; unlisten?.(); };
  }, [enabled]);
  if (!enabled) return null;
  const run = async (operation: () => Promise<void>, refresh = false) => {
    setError("");
    try { await operation(); if (refresh) setMaximized(await windowService.isMaximized()); }
    catch { setError("The window action failed. Please try again."); }
  };
  return <header className="window-chrome" aria-label="Window title bar" data-window-chrome data-tauri-drag-region>
    <span className="window-brand" data-tauri-drag-region><img src="/favicon.svg" alt="" />Meridian</span>
    <div className="window-controls" role="group" aria-label="Window controls">
      <button type="button" aria-label="Minimize window" title="Minimize" onClick={() => void run(windowService.minimize)}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 6.5h10" /></svg>
      </button>
      <button type="button" aria-label={maximized ? "Restore window" : "Maximize window"} title={maximized ? "Restore" : "Maximize"} onClick={() => void run(windowService.toggleMaximize, true)}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">{maximized ? <path d="M3.5 3.5v-2h7v7h-2m-7-5h7v7h-7z" /> : <rect x="1.5" y="1.5" width="9" height="9" />}</svg>
      </button>
      <button type="button" className="window-close" aria-label="Close window" title="Close" onClick={() => void run(windowService.close)}>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m1.5 1.5 9 9m0-9-9 9" /></svg>
      </button>
    </div>
    {error && <p className="window-error" role="alert">{error}</p>}
  </header>;
}
