# Windows window chrome

Windows builds replace the system caption with a 32px title strip in the app's existing light/dark colors. The strip has conventional Windows minimize, maximize/restore and close glyphs. There are no imitation macOS traffic lights. macOS and Linux retain their configured system decorations, and browser preview does not display native window controls.

`src-tauri/src/lib.rs` disables decorations in the Windows context before the window is created. React renders `WindowChrome` only in a Windows Tauri WebView. `src/services/window.ts` owns native window operations; these remain separate from catalog commands. The main-window capability grants minimize, toggle-maximize and close. Existing Tauri drag regions support dragging and double-click maximize/restore. The app remains resizable.

`WindowChrome` tracks maximize state on native resize events and after its maximize action. Failed actions show a recoverable message. Modal focus isolation leaves the native caption available, while keyboard focus stays within the dialog. No storage paths, database schema, book commands or installer identity change.

## Verification

Four frontend tests cover native operations, maximize/restore state (including external resize), listener cleanup, failed-action retry, platform/preview exclusion and caption availability during a modal edit sheet. Full verification includes frontend/core tests, representative catalogs and normal Windows MSI/NSIS packaging.

The separate smoke-test product checks native decoration/resizable state, clicks the production maximize/restore/minimize controls and verifies the resulting native window state. It also checks control reachability and horizontal overflow at 200% WebView zoom. Its `visual` stage permits manual inspection against marked isolated storage. Normal builds exclude the driver, flags and smoke commands. The runner supports the same optional `CARGO_TARGET_DIR` as the desktop build wrapper.

October 9 verification passed: 35 frontend tests, 27 Rust tests, catalog checks at 0/10/1,000/10,000 records, regular MSI/NSIS packaging and 56 installed native smoke checks (including light/dark colors and modal/200% control reachability). Live Windows inspection confirmed both themes, double-click maximize/restore and the production Close control. Mouse dragging and edge resizing remain manual acceptance items: the automation gesture did not demonstrate movement, though native resizable state and the built-in Tauri drag-region configuration are verified. Windows 11's maximize-hover Snap Layout flyout is not implemented by these HTML caption buttons; OS keyboard snapping remains available. Native macOS behavior and screen-reader qualification remain outside this Windows increment.
