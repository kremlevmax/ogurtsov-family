/** Card background token this always tints toward — matches `--color-bg-elevated` in app/globals.css. */
const CARD_BG = { r: 0xfa, g: 0xf6, b: 0xec };

/** Blends a `#rrggbb` branch color toward the card background — the same light-tint formula used across the branch-highlighting mockup, kept here as one shared utility instead of recomputed per component. */
export function tintTowardCardBg(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);

  const mix = (channel: number, base: number) => Math.round(channel * amount + base * (1 - amount));
  return `rgb(${mix(r, CARD_BG.r)}, ${mix(g, CARD_BG.g)}, ${mix(b, CARD_BG.b)})`;
}
