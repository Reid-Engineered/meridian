import { useEffect, useState } from "react";

/** Appearance preference. "system" follows the operating system's light/dark setting. */
export const THEME_IDS = ["light", "dark", "system", "strawberry", "mocha", "ube", "windows-95"] as const;
export type ThemePreference = typeof THEME_IDS[number];

const KEY = "meridian-theme";
const query = () => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(KEY);
    return THEME_IDS.find(id => id === stored) ?? "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference, systemDark = query()?.matches ?? false): Exclude<ThemePreference, "system"> {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

/** Keeps `<html data-theme>` in step with the preference and, for "system", with OS changes. */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const mq = query();
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  const resolved = resolveTheme(preference, systemDark);
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    try { localStorage.setItem(KEY, preference); } catch { /* preference stays in memory */ }
  }, [preference, resolved]);
  return { preference, resolved, setPreference };
}
