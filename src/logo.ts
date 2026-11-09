import { useEffect, useState } from "react";

/** How the Meridian logo sits at the top of the sidebar. */
export const LOGO_POSITIONS = ["left", "centered"] as const;
export type LogoPosition = typeof LOGO_POSITIONS[number];
/** Whether the logo shows the "Meridian" name beside the symbol. */
export const LOGO_STYLES = ["full", "symbol"] as const;
export type LogoStyle = typeof LOGO_STYLES[number];

const POSITION_KEY = "meridian-logo-position";
const STYLE_KEY = "meridian-logo-style";

function read<T extends string>(key: string, values: readonly T[], fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return values.find(v => v === stored) ?? fallback;
  } catch {
    return fallback;
  }
}

export const readLogoPosition = () => read(POSITION_KEY, LOGO_POSITIONS, "left");
export const readLogoStyle = () => read(STYLE_KEY, LOGO_STYLES, "full");

export function useLogoPreferences() {
  const [position, setPosition] = useState<LogoPosition>(readLogoPosition);
  const [style, setStyle] = useState<LogoStyle>(readLogoStyle);
  useEffect(() => {
    try { localStorage.setItem(POSITION_KEY, position); localStorage.setItem(STYLE_KEY, style); } catch { /* preferences stay in memory */ }
  }, [position, style]);
  return { position, setPosition, style, setStyle };
}
