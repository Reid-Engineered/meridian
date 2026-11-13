import type { CSSProperties } from "react";
import { RotateCw } from "lucide-react";

export interface WheelSlice {
  id: number;
  label: string;
  sublabel?: string;
}

export const WHEEL_PALETTE: readonly { bg: string; fg: string }[] = [
  { bg: "#A65A2A", fg: "#FFFFFF" },
  { bg: "#3B6E8C", fg: "#FFFFFF" },
  { bg: "#4D7C5B", fg: "#FFFFFF" },
  { bg: "#C88A2E", fg: "#1D1D1F" },
  { bg: "#7E4B78", fg: "#FFFFFF" },
  { bg: "#B84C4C", fg: "#FFFFFF" },
  { bg: "#2E7D73", fg: "#FFFFFF" },
  { bg: "#8C6D46", fg: "#FFFFFF" },
  { bg: "#5B6BB2", fg: "#FFFFFF" },
  { bg: "#D29B53", fg: "#1D1D1F" },
  { bg: "#648252", fg: "#FFFFFF" },
  { bg: "#9A526B", fg: "#FFFFFF" },
];

export function sliceColor(index: number, total: number): { bg: string; fg: string } {
  const n = WHEEL_PALETTE.length;
  let ci = index % n;
  if (total > 1 && index === total - 1 && ci === 0) {
    ci = total > 2 ? 2 : 1;
  }
  return WHEEL_PALETTE[ci];
}

export function polarToCartesian(cx: number, cy: number, radius: number, angleClockwiseFromTop: number) {
  const rad = (angleClockwiseFromTop * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad),
  };
}

export function describeSlicePath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z`;
}

/** Returns which slice index sits under the 12-o'clock pointer for a given clockwise wheel rotation. */
export function indexAtRotation(rotationDeg: number, total: number): number {
  if (total <= 0) return -1;
  if (total === 1) return 0;
  const delta = 360 / total;
  const localAngle = (((360 - (rotationDeg % 360)) % 360) + 360) % 360;
  return Math.floor(localAngle / delta) % total;
}

/** Computes a strictly increasing clockwise rotation that lands safely inside `winnerIndex`. */
export function computeNextSpinRotation(
  currentRotation: number,
  winnerIndex: number,
  total: number,
  extraTurns = 6,
  jitterFraction = 0.5
): number {
  if (total <= 1) return currentRotation + extraTurns * 360;
  const delta = 360 / total;
  const clampedJitter = Math.max(0, Math.min(1, jitterFraction));
  const offsetInSlice = (0.2 + clampedJitter * 0.6) * delta;
  const targetLocalAngle = winnerIndex * delta + offsetInSlice;
  const targetMod = (((360 - (targetLocalAngle % 360)) % 360) + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const deltaMod = (targetMod - currentMod + 360) % 360;
  return currentRotation + extraTurns * 360 + deltaMod;
}

function truncateLabel(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxChars - 1)).trimEnd()}\u2026`;
}

type Props = {
  items: WheelSlice[];
  rotation: number;
  spinning: boolean;
  spinDurationMs: number;
  winnerIndex: number | null;
  onSpin: () => void;
};

const CX = 200;
const CY = 200;
const OUTER_RIM = 188;
const WHEEL_RADIUS = 176;

export function PieWheel({ items, rotation, spinning, spinDurationMs, winnerIndex, onSpin }: Props) {
  const total = items.length;
  const delta = total > 0 ? 360 / total : 360;
  const fontSize = total <= 6 ? 13 : total <= 12 ? 11.5 : total <= 18 ? 10 : total <= 26 ? 8.5 : 7.5;
  const maxChars = total <= 6 ? 18 : total <= 12 ? 16 : total <= 18 ? 14 : 11;

  const discStyle: CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    transition: spinning && spinDurationMs > 0
      ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.85, 0.16, 1)`
      : "none",
  };

  return (
    <div className={`wheel-wrap${spinning ? " is-spinning" : ""}`}>
      <div className="wheel-pointer" aria-hidden="true">
        <svg viewBox="0 0 32 38" width="32" height="38">
          <path d="M16 36 L4 10 C2.5 6 5.5 2 10 2 L22 2 C26.5 2 29.5 6 28 10 Z" />
          <circle cx="16" cy="11" r="4" />
        </svg>
      </div>

      <div className="wheel-disc" style={discStyle}>
        <svg
          className="wheel-svg"
          viewBox="0 0 400 400"
          role="img"
          aria-label={total > 0 ? `Book wheel with ${total} ${total === 1 ? "book" : "books"}` : "Empty book wheel"}
        >
          <circle className="wheel-rim" cx={CX} cy={CY} r={OUTER_RIM} />

          {total === 0 && (
            <circle className="wheel-empty-disc" cx={CX} cy={CY} r={WHEEL_RADIUS} />
          )}

          {total === 1 && (() => {
            const color = sliceColor(0, 1);
            const isWinner = winnerIndex === 0 && !spinning;
            return (
              <g className={isWinner ? "wheel-slice is-winner" : "wheel-slice"}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={WHEEL_RADIUS}
                  fill={color.bg}
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  <title>{items[0].label}</title>
                </circle>
                <text
                  x={CX}
                  y={CY - 96}
                  fill={color.fg}
                  fontSize={14}
                  fontWeight={600}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {truncateLabel(items[0].label, 22)}
                </text>
              </g>
            );
          })()}

          {total > 1 && items.map((item, i) => {
            const startAngle = i * delta;
            const endAngle = (i + 1) * delta;
            const midAngle = (i + 0.5) * delta;
            const color = sliceColor(i, total);
            const isWinner = winnerIndex === i && !spinning;
            const flip = midAngle > 180;
            const labelRadius = total > 20 ? 116 : 108;
            const peg = polarToCartesian(CX, CY, OUTER_RIM - 6, startAngle);

            return (
              <g key={item.id} className={isWinner ? "wheel-slice is-winner" : "wheel-slice"}>
                <path
                  d={describeSlicePath(CX, CY, WHEEL_RADIUS, startAngle, endAngle)}
                  fill={color.bg}
                  stroke="var(--surface)"
                  strokeWidth={total > 20 ? 1.25 : 2}
                >
                  <title>{item.sublabel ? `${item.label} — ${item.sublabel}` : item.label}</title>
                </path>
                {total <= 36 && (
                  <g transform={`translate(${CX}, ${CY}) rotate(${flip ? midAngle + 90 : midAngle - 90})`}>
                    <text
                      x={flip ? -labelRadius : labelRadius}
                      y={0}
                      fill={color.fg}
                      fontSize={fontSize}
                      fontWeight={600}
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {truncateLabel(item.label, maxChars)}
                    </text>
                  </g>
                )}
                <circle className="wheel-peg" cx={peg.x} cy={peg.y} r={2.5} />
              </g>
            );
          })}

          <circle className="wheel-inner-ring" cx={CX} cy={CY} r={39} />
        </svg>
      </div>

      <button
        type="button"
        className="wheel-hub"
        onClick={onSpin}
        disabled={spinning || total === 0}
        aria-label={spinning ? "Spinning wheel" : "Spin the wheel"}
      >
        <RotateCw size={18} aria-hidden="true" className={spinning ? "spin-icon" : ""} />
        <span>{spinning ? "Spinning" : "Spin"}</span>
      </button>
    </div>
  );
}
