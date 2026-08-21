import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { ROW_GAP } from "@/features/tree/layout";

/**
 * How far *above* a union's dot the bend sits, in px — i.e. `ROW_GAP -
 * BEND_OFFSET` (below) is how far *below the parent's card* it sits.
 * Must clear xyflow's own default gap on the target side (`ROW_GAP` −
 * its default smoothstep offset, 20): picking a bend height deeper than
 * that leaves the final approach into the dot needing to curve back
 * *upward* before it can turn back down to the target, a real artifact
 * that rendered as a small stray flag pointing up out of the merge line
 * (real bug report, screenshot with an arrow marking it) — this was
 * caught at `BEND_OFFSET = 20` (bend 50px below the card, only 20px
 * above the dot — too close). 30 keeps the bend a comfortable 20px
 * clear of that boundary on real tree geometry, verified directly
 * against xyflow's path builder before shipping (see the component doc
 * below), not just eyeballed.
 */
const BEND_OFFSET = 30;

/**
 * Every edge from a parent's card down to their union (whether that
 * union has children, or is a childless couple's direct tie to their
 * partner's card — see `directTieUnits` in to-react-flow.ts) uses this
 * instead of stock "smoothstep". xyflow's default path picks its own
 * bend height by comparing the horizontal vs. vertical distance between
 * source and target and switching formulas depending on which is
 * larger — for a real union that distance depends on where its dot ends
 * up relative to its OTHER parent, so two unions on the very same row
 * can legitimately get different bend heights from stock smoothstep,
 * confirmed by pixel-measuring two screenshots where they didn't match.
 *
 * Forcing a fixed bend height turned out to need two different levers
 * depending on the handles involved, verified against xyflow's own path
 * builder directly rather than guessed: when source and target face the
 * *same* direction (a childless couple's direct tie — both "bottom"),
 * an explicit `centerY` is silently ignored by that geometry's branch of
 * the algorithm, but `offset` still lands exactly on `sourceY + offset`;
 * when they face *opposite* directions (a real union's parentToUnit
 * edge — "bottom" into the dot's "top"), it's the reverse: `centerY` is
 * honored exactly, while an `offset` big enough to reach the same bend
 * height distorts the curve into a lopsided zigzag instead. Picking the
 * lever by comparing the two positions covers both without depending on
 * which of xyflow's internal branches a given pair of points happens to
 * fall into.
 */
export function ParentTieEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}: EdgeProps) {
  const bendDrop = ROW_GAP - BEND_OFFSET;
  const sameDirection = sourcePosition === targetPosition;
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    ...(sameDirection ? { offset: bendDrop } : { centerY: sourceY + bendDrop }),
  });

  return <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />;
}
