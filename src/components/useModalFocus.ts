import { useLayoutEffect, useRef } from "react";

type Layer = { root: HTMLElement; close: () => void };
const layers: Layer[] = [];
const originalInert = new Map<HTMLElement, boolean>();
const selector = 'button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]';
function focusable(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(el => el.tabIndex >= 0 &&
    !el.closest('[hidden], [inert]') && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden");
}
function focusInitial(root: HTMLElement) {
  (root.querySelector<HTMLElement>('[data-modal-initial]:not(:disabled)') ?? focusable(root)[0] ??
    root.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]') ?? root).focus();
}
function isolateTopLayer() {
  for (const [el, inert] of originalInert) el.inert = inert;
  originalInert.clear();
  let branch: HTMLElement | undefined = layers[layers.length - 1]?.root;
  while (branch?.parentElement) {
    for (const sibling of Array.from(branch.parentElement.children)) {
      if (sibling !== branch && sibling instanceof HTMLElement && !['SCRIPT', 'STYLE'].includes(sibling.tagName)) {
        originalInert.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    branch = branch.parentElement;
  }
}

/** Only the top mounted layer owns focus and Escape; lower layers remain mounted. */
export function useModalFocus<T extends HTMLElement>(onClose: () => void, active = true) {
  const root = useRef<T>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    if (!active || !root.current) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const layer = { root: root.current, close: () => close.current() };
    layers.push(layer);
    isolateTopLayer();
    focusInitial(layer.root);
    const onKey = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== layer) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation(); layer.close();
      } else if (event.key === 'Tab') {
        const items = focusable(layer.root);
        const first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); focusInitial(layer.root); }
        else if (event.shiftKey && (document.activeElement === first || !layer.root.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !layer.root.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (layers[layers.length - 1] === layer && event.target instanceof Node && !layer.root.contains(event.target)) focusInitial(layer.root);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus);
      layers.splice(layers.indexOf(layer), 1);
      isolateTopLayer();
      const top = layers[layers.length - 1];
      if (opener?.isConnected && !opener.closest('[inert]') && (!top || top.root.contains(opener))) opener.focus();
      else if (top) focusInitial(top.root);
      else document.querySelector<HTMLElement>('[data-focus-fallback]')?.focus();
    };
  }, [active]);
  return root;
}
