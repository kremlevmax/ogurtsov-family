import { Handle, Position } from "@xyflow/react";
import { FAMILY_UNIT_NODE_SIZE } from "@/features/tree/layout";

/**
 * Structural node connecting a couple to their children. Not a real
 * person and never resolvable as one (CLAUDE.md 5.2).
 *
 * Size is set inline from FAMILY_UNIT_NODE_SIZE (not a Tailwind class)
 * so it can never drift from the size ELK used to compute positions —
 * a mismatch there shifts the dot's visual center and kinks the lines
 * connecting to it.
 */
export function FamilyUnitNode() {
  return (
    <div
      aria-hidden="true"
      style={{ width: FAMILY_UNIT_NODE_SIZE.width, height: FAMILY_UNIT_NODE_SIZE.height }}
      className="rounded-full border border-(--color-fg-muted) bg-(--color-bg-elevated)"
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
