import { useEffect, useState } from "react";

/** Where the Meridian logo appears: at the top of the sidebar, or centered above the main content. */
export const LOGO_POSITIONS = ["sidebar", "centered"] as const;
export type LogoPosition = typeof LOGO_POSITIONS[number];

const KEY = "meridian-logo-position";

export function readLogoPosition(): LogoPosition {
  try {
    return localStorage.getItem(KEY) === "centered" ? "centered" : "sidebar";
  } catch {
    return "sidebar";
  }
}

export function useLogoPosition() {
  const [position, setPosition] = useState<LogoPosition>(readLogoPosition);
  useEffect(() => {
    try { localStorage.setItem(KEY, position); } catch { /* preference stays in memory */ }
  }, [position]);
  return { position, setPosition };
}
