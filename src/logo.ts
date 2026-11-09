import { useEffect, useState } from "react";

/** How the Meridian logo sits at the top of the sidebar. */
export const LOGO_POSITIONS = ["left", "centered"] as const;
export type LogoPosition = typeof LOGO_POSITIONS[number];

const KEY = "meridian-logo-position";

export function readLogoPosition(): LogoPosition {
  try {
    return localStorage.getItem(KEY) === "centered" ? "centered" : "left";
  } catch {
    return "left";
  }
}

export function useLogoPosition() {
  const [position, setPosition] = useState<LogoPosition>(readLogoPosition);
  useEffect(() => {
    try { localStorage.setItem(KEY, position); } catch { /* preference stays in memory */ }
  }, [position]);
  return { position, setPosition };
}
