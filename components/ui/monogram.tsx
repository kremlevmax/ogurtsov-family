/**
 * The site's circular monogram mark ("О" for Огурцовы), replacing the
 * old text-only header logo per the 2026-08-29 Figma redesign
 * (docs/DECISIONS.md). Plain text in a bordered circle — no external
 * asset (CLAUDE.md 14).
 */
export function Monogram({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={
        "font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--color-gold) text-base text-(--color-fg) " +
        (className ?? "")
      }
    >
      О
    </span>
  );
}
