import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FAMILY_UNIT_NODE_SIZE } from "@/features/tree/layout";
import { cn } from "@/lib/utils/cn";
import type { FamilyFlowNode, FamilyUnitNodeData } from "@/features/tree/to-react-flow";

/**
 * Structural node connecting a couple to their children. Not a real
 * person and never resolvable as one (CLAUDE.md 5.2).
 *
 * Size is set inline from FAMILY_UNIT_NODE_SIZE (not a Tailwind class)
 * so it can never drift from the size ELK used to compute positions —
 * a mismatch there shifts the dot's visual center and kinks the lines
 * connecting to it. The circle itself only paints when this union
 * actually has a child to connect down to — a partner-only union
 * (`hasChildren: false`) still needs this node and its edges to seat
 * the couple side by side and converge their connector at the same
 * point, it just doesn't draw a dot with nowhere further to go.
 */
export function FamilyUnitNode({ data }: NodeProps<Extract<FamilyFlowNode, { type: "familyUnit" }>>) {
  const { hasChildren } = data as FamilyUnitNodeData;

  return (
    <div
      aria-hidden="true"
      style={{ width: FAMILY_UNIT_NODE_SIZE.width, height: FAMILY_UNIT_NODE_SIZE.height }}
      className={cn("rounded-full", hasChildren && "border border-(--color-fg-muted) bg-(--color-bg-elevated)")}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
