import type { CSSProperties } from "react";

/**
 * A single restrained decorative flourish (fleuron) — the only
 * ornamental element the redesign allows (docs/DESIGN_SYSTEM.md,
 * "Декоративные акценты"; CLAUDE.md 10 rules out imitating old paper).
 * Inline SVG, no external asset, recolors via `currentColor` so it
 * follows the surrounding text color.
 */
export function Ornament({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 160 20"
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M2 10H54" />
      <path d="M106 10H158" />
      <path d="M54 10C58 10 60 6 64 6" />
      <path d="M54 10C58 10 60 14 64 14" />
      <path d="M106 10C102 10 100 6 96 6" />
      <path d="M106 10C102 10 100 14 96 14" />
      <path d="M80 2C80 2 70 6 70 10C70 14 80 18 80 18C80 18 90 14 90 10C90 6 80 2 80 2Z" />
      <circle cx="80" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * A paisley-style corner vine — a sweeping curl that spirals into a
 * coiled tip, plus a small satellite tendril, hanging just inside a
 * card-frame corner (the frame's own rounded corner is drawn by the
 * card's CSS border, so this doesn't retrace that arc — it's a
 * separate flourish attached near it, same as the reference's corner
 * ornaments). Own drawing, not traced from any reference artwork (see
 * docs/DECISIONS.md). Drawn for the top-left corner (curls in from the
 * top-left, toward the bottom-right); flip with CSS (`scale-x-[-1]`,
 * `scale-y-[-1]`, or both) for the other three corners.
 */
export function CornerScroll({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    >
      <path d="M3 3C3 12 6 18 14 19.5" />
      <path d="M14 19.5C17.5 20 19.8 18.2 19 15.8C18.3 13.8 15.8 14 15.3 16" />
      <path d="M6 9.5C8 9.3 9.8 10.6 9.6 12.6" />
      <path d="M3 3C11 3 16 5 17 11" />
      <circle cx="15.3" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * The small wave-and-drop crest on all four sides of every tree card's
 * frame in the "Викторианский альбом" direction (docs/DECISIONS.md,
 * 2026-08-20) — top/bottom sit just inside the card's own border
 * (rotated 90° for left/right). `Ornament` remains a separate, simpler
 * line-diamond-line divider used elsewhere on the site (e.g. the site
 * header), not on tree cards. Own drawing (see `CornerScroll`'s note).
 */
export function CardCrest({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 46 14"
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M2 10C10 10 14 2 23 2C32 2 36 10 44 10" />
      <path d="M23 2L23 8" />
      <circle cx="23" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
