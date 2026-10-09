import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { Check } from "lucide-react";

/**
 * Closes a non-modal popup on Escape (handled before the inspector's document listener),
 * on a pointer press outside it, or when focus leaves it. Focus returns to the trigger on Escape.
 */
export function useDismiss(open: boolean, close: () => void, popup: RefObject<HTMLElement>, trigger: RefObject<HTMLElement>) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent | MouseEvent) => {
      const t = e.target as Node;
      if (!popup.current?.contains(t) && !trigger.current?.contains(t)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!popup.current?.contains(document.activeElement) && document.activeElement !== trigger.current) return;
      e.preventDefault(); e.stopPropagation();
      closeRef.current(); trigger.current?.focus();
    };
    // Tab / Shift+Tab (or a click) that moves focus outside both the popup and its trigger dismisses it,
    // so a stale popup never keeps Escape away from the layer the person is actually in.
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node;
      if (!popup.current?.contains(t) && !trigger.current?.contains(t)) closeRef.current();
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("focusin", onFocus);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey, true); document.removeEventListener("focusin", onFocus); };
  }, [open, popup, trigger]);
}

export type MenuGroup<T extends string> = { label?: string; items: { value: T; label: string }[]; selected: T; onSelect: (value: T) => void };

/** A capsule button that opens a menu of radio groups (e.g. Sort By + Order). Arrow keys, Home/End, Enter/Space, Escape. */
export function MenuButton<T extends string>({ label, icon, menuLabel, groups, align = "start" }: { label: ReactNode; icon?: ReactNode; menuLabel: string; groups: MenuGroup<T>[]; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), menu, trigger);
  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []);
  useEffect(() => { if (open) (items().find(i => i.getAttribute("aria-checked") === "true") ?? items()[0])?.focus(); }, [open]);
  const onMenuKey = (e: React.KeyboardEvent) => {
    const list = items(), i = list.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); list[(n + list.length) % list.length]?.focus(); };
    if (e.key === "ArrowDown") go(i + 1); else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0); else if (e.key === "End") go(list.length - 1);
    else if (e.key === "Tab") setOpen(false);
  };
  return <div className="menu-anchor">
    <button ref={trigger} type="button" className="glass capsule" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => setOpen(o => !o)} onKeyDown={e => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); } }}>
      {icon}<span className="cap-label">{label}</span>
    </button>
    {open && <div ref={menu} id={id} role="menu" aria-label={menuLabel} className={`mac-menu align-${align}`} onKeyDown={onMenuKey}>
      {groups.map((g, gi) => <div key={gi} role="group" aria-label={g.label}>
        {gi > 0 && <div className="menu-sep" role="separator" />}
        {g.label && <div className="menu-head" aria-hidden="true">{g.label}</div>}
        {g.items.map(it => <button key={it.value} type="button" role="menuitemradio" aria-checked={g.selected === it.value} tabIndex={-1} className="menu-item"
          onClick={() => { g.onSelect(it.value); setOpen(false); trigger.current?.focus(); }}>
          <span className="menu-check">{g.selected === it.value && <Check size={12} strokeWidth={2.4} />}</span>{it.label}
        </button>)}
      </div>)}
    </div>}
  </div>;
}
