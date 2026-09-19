import { Download } from "lucide-react";
import { PassportTreeDiagram } from "@/components/passport/passport-tree-diagram";
import type { PassportTreeData } from "@/features/passport-tree/types";

export interface PassportPosterProps {
  data: PassportTreeData;
  instanceId: string;
}

/**
 * The diagram plus a "Скачать плакат" link straight to the approved
 * artwork file (owner's request) — not a rasterized copy of the
 * on-screen SVG. The file this downloads still has the artwork's own
 * original baked-in labels (including the still-unresolved items from
 * docs/DECISIONS.md, like "Игнат — приёмник"); only the on-screen
 * version has those corrected.
 */
export function PassportPoster({ data, instanceId }: PassportPosterProps) {
  return (
    <div>
      <div className="overflow-hidden rounded-[var(--radius-md)] shadow-(--shadow-md)">
        <PassportTreeDiagram data={data} instanceId={instanceId} />
      </div>

      <div className="mt-6 flex justify-center">
        <a
          href="/passport/base-artwork.png"
          download
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-4 text-base text-(--color-fg) transition-colors hover:bg-(--color-bg)"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Скачать плакат
        </a>
      </div>
    </div>
  );
}
