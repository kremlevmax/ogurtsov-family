import { Ornament } from "@/components/ui/ornament";

/**
 * The decorative "Род Огурцовых / НАША ИСТОРИЯ · НАШИ КОРНИ · НАШЕ
 * НАСЛЕДИЕ" banner from the Figma handoff (ogurtsovy_pages_handoff_v2),
 * shown above the Photos/Documents panel. Deliberately separate from
 * the site's own sticky `Header` (components/layout/header.tsx) — that
 * one keeps real nav/auth state and is untouched; this is a page-scoped
 * addition, using the same `Ornament` fleuron the rest of the site
 * already uses (docs/DESIGN_SYSTEM.md: "the only ornamental element the
 * redesign allows"), not a new drawing.
 */
export function HeritageHeader() {
  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-10 pb-6 text-center">
      <Ornament className="h-4 w-28 text-(--h-gold-500)" />
      <h1 className="font-heading text-4xl text-(--h-forest-800) sm:text-5xl">Род Огурцовых</h1>
      <div className="h-px w-full max-w-3xl bg-(--h-gold-200)" />
      <p className="text-label text-base tracking-[0.2em] text-(--h-gold-700)">
        НАША ИСТОРИЯ · НАШИ КОРНИ · НАШЕ НАСЛЕДИЕ
      </p>
    </div>
  );
}
