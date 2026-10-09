import { useEffect, useState } from "react";

/** Appearance preference. "system" follows the operating system's light/dark setting. */
export type ThemePreference = "light" | "dark" | "system";

const KEY = "meridian-theme";
const query = () => (typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : null);

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(preference: ThemePreference, systemDark = query()?.matches ?? false): "light" | "dark" {
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
