import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/** Native window operations stay behind an adapter, separate from catalog operations. */
export const windowService = {
  hasCustomChrome: () => isTauri() && navigator.platform.startsWith("Win"),
  isMaximized: () => getCurrentWindow().isMaximized(),
  onResize: (handler: () => void) => getCurrentWindow().onResized(handler),
  minimize: () => getCurrentWindow().minimize(),
  toggleMaximize: () => getCurrentWindow().toggleMaximize(),
  close: () => getCurrentWindow().close(),
};
