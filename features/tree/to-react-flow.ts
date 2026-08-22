import type { Edge, Node } from "@xyflow/react";
import {
  buildFamilyGraph,
  type FamilyGraph,
  type FamilyGraphNode,
  type TreePerson,
  type TreeRelationship,
} from "./build-graph";
import { isBranchRoot, resolveBranchColors } from "./branch-colors";
import { layoutFamilyGraph, type PositionedNode } from "./layout";

export interface PersonNodeData extends Record<string, unknown> {
  person: TreePerson;
  /** Resolved branch color (own or inherited from the nearest blood ancestor) — null if this person belongs to no branch. */
  branchColor: string | null;
  /** True only for the literal branch founder, not their descendants — gets the larger, double-bordered treatment. */
  isBranchRoot: boolean;
  /** A one-off highlight on just this person (people.highlight_color) — never inherited, independent of branchColor/isBranchRoot. */
  highlightColor: string | null;
}

export interface FamilyUnitNodeData extends Record<string, unknown> {
  parentIds: string[];
  /** False for a partner-only union with no shared child — the dot itself stays invisible then (no line to route down to), while the node/edges still exist so the layout keeps seating the couple side by side and the connector still converges at the same point it always did. */
  hasChildren: boolean;
}

export type FamilyFlowNode = Node<PersonNodeData, "person"> | Node<FamilyUnitNodeData, "familyUnit">;

/** Builds positioned React Flow nodes/edges for the family tree canvas. */
export async function buildReactFlowGraph(
  people: TreePerson[],
  relationships: TreeRelationship[],
): Promise<{ nodes: FamilyFlowNode[]; edges: Edge[] }> {
  const graph = buildFamilyGraph(people, relationships);
  const positions = await layoutFamilyGraph(graph);
  const positionById = new Map(positions.map((position) => [position.id, position]));
  const branchColors = resolveBranchColors(people, relationships);

  // Each pass can nudge the *next* one loose: straightening the line
  // into a sole child can carry their own spouse sideways with them
  // (see `centerSoleChildren`'s doc comment), which leaves that
  // couple's own family-unit dot behind their new position — and
  // recentering *that* dot can in turn de-center *their* sole child,
  // and so on down the generations. Repeating both passes until they
  // stop finding anything to move — not just running each once —
  // is what actually reaches every generation, not just the first one
  // touched (real case: 4 generations of straight-line couples, only
  // the top one changed to running each pass a single time).
  for (let pass = 0; pass < 20; pass++) {
    const changedUnits = centerTwoParentUnits(graph.nodes, positionById);
    const changedChildren = centerSoleChildren(graph, positionById);
    if (!changedUnits && !changedChildren) break;
  }

  // A partner-only union (spouse/former_spouse/partner with no shared
  // child) still needs its family-unit node exactly as before — that's
  // what seats the couple side by side — but its dot has nowhere to
  // route a line down to. FamilyUnitNode (components/tree/family-unit-
  // node.tsx) simply doesn't draw the circle when `hasChildren` is
  // false; the node and its position are otherwise untouched.
  const unitsWithChildren = new Set(
    graph.edges.filter((edge) => edge.kind === "unitToChild").map((edge) => edge.source),
  );

  // For a childless TWO-parent union, routing both parentToUnit edges
  // into that invisible dot (like a real parent-child union does) always
  // leaves a visible trace of the dot's position: smoothstep bends both
  // edges at the same height on their way to the shared target, so they
  // read as one continuous bar spanning the full gap between the two
  // cards, with a small kink sitting right at the target — a miniature
  // version of the exact "stub reaching for a child that isn't there"
  // shape this was meant to remove (real bug report: Наталья Ивановна
  // Огурцова и Егор Егорович Огурцов). There's a simpler shape available
  // precisely because there are exactly two parents and nothing below
  // them: one direct edge from one card's bottom straight to the
  // other's, using the second bottom-positioned target handle
  // (`id="bottom"`) person-node.tsx adds for this — same drop-curve-
  // curve-rise silhouette as a real union's merge, just closing directly
  // on the neighbor instead of bending toward a third point.
  const directTieUnits = new Set(
    graph.nodes
      .filter(
        (node): node is Extract<FamilyGraphNode, { kind: "familyUnit" }> =>
          node.kind === "familyUnit" && !unitsWithChildren.has(node.id) && node.parentIds.length === 2,
      )
      .map((node) => node.id),
  );

  const nodes: FamilyFlowNode[] = graph.nodes.map((node) => {
    const position = positionById.get(node.id) ?? { x: 0, y: 0 };

    if (node.kind === "person") {
      return {
        id: node.id,
        type: "person",
        position,
        data: {
          person: node.person,
          branchColor: branchColors.get(node.id) ?? null,
          isBranchRoot: isBranchRoot(node.person, branchColors),
          highlightColor: node.person.highlightColor,
        },
      } satisfies Node<PersonNodeData, "person">;
    }

    return {
      id: node.id,
      type: "familyUnit",
      position,
      data: { parentIds: node.parentIds, hasChildren: unitsWithChildren.has(node.id) },
    } satisfies Node<FamilyUnitNodeData, "familyUnit">;
  });

  // An edge's color follows whichever end of it is a person (parentToUnit:
  // source: unitToChild: target) — a married-in spouse simply has no
  // resolved color, so their edge falls back to neutral automatically,
  // with no separate "is this a spouse edge" check needed.
  const edges: Edge[] = [];

  for (const unit of graph.nodes) {
    if (unit.kind !== "familyUnit" || !directTieUnits.has(unit.id)) continue;
    const [a, b] = unit.parentIds;
    const color = branchColors.get(a) ?? branchColors.get(b);
    edges.push({
      id: `tie:${unit.id}`,
      source: a,
      target: b,
      targetHandle: "bottom",
      // "parentTie" (components/tree/parent-tie-edge.tsx) — same custom
      // edge every parentToUnit edge below uses, so this direct tie bends
      // at exactly the same height any of them would. See that
      // component's doc for why stock "smoothstep" can't guarantee this.
      type: "parentTie",
      style: { strokeWidth: color ? 2 : 1.5, stroke: color ?? "var(--color-fg-muted)" },
    });
  }

  for (const edge of graph.edges) {
    // Replaced by the direct tie above — routing it into the union's own
    // (invisible) dot as well would draw the same couple twice.
    if (edge.kind === "parentToUnit" && directTieUnits.has(edge.target)) continue;

    const personEndId = edge.kind === "parentToUnit" ? edge.source : edge.target;
    const color = branchColors.get(personEndId);
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // Every parentToUnit edge — child-having union or a single-parent
      // childless one (placeholder/unknown other parent, the only
      // childless case left routing into its own dot instead of a direct
      // tie) — uses the same custom "parentTie" edge as the direct ties
      // above, so its bend height never depends on where its particular
      // target happens to sit. unitToChild edges are unrelated to any of
      // this and keep the stock "smoothstep" behavior.
      type: edge.kind === "parentToUnit" ? "parentTie" : "smoothstep",
      style: { strokeWidth: color ? 2 : 1.5, stroke: color ?? "var(--color-fg-muted)" },
    });
  }

  return { nodes, edges };
}

/** Minimum gap two node boxes must keep — matches `elk.spacing.nodeNode` (layout.ts) so a "cosmetic" recenter can never leave nodes touching or closer than ELK itself would ever place them. */
const MIN_NODE_GAP = 36;

/**
 * Would moving `movedId` to `newX` (keeping its current y/width/height)
 * leave it closer than `MIN_NODE_GAP` to any other node's box? Cosmetic
 * recentering (family-unit/child alignment) must never introduce an
 * overlap — e.g. recentering an only child under their parents can push
 * them into a sibling's spouse sitting right next to them.
 */
function wouldCollide(
  movedId: string,
  newX: number,
  positionById: Map<string, PositionedNode>,
  excludeIds?: ReadonlySet<string>,
): boolean {
  const moved = positionById.get(movedId);
  if (!moved) return true;

  const bottom = moved.y + moved.height + MIN_NODE_GAP;
  const left = newX - MIN_NODE_GAP;
  const right = newX + moved.width + MIN_NODE_GAP;

  for (const [otherId, other] of positionById) {
    if (otherId === movedId || excludeIds?.has(otherId)) continue;
    const verticalOverlap = moved.y < other.y + other.height && bottom > other.y;
    if (!verticalOverlap) continue;
    const horizontalOverlap = left < other.x + other.width && right > other.x;
    if (horizontalOverlap) return true;
  }
  return false;
}

/**
 * ELK picks each family-unit node's x to balance both its parents above
 * and its children fan-out below, which can leave one parent's connector
 * a straight vertical drop and the other's visibly kinked sideways. For
 * a two-parent couple, re-centering the unit exactly on the midpoint
 * between the parents makes both connectors symmetric mirror images.
 */
function centerTwoParentUnits(
  nodes: FamilyGraphNode[],
  positionById: Map<string, PositionedNode>,
): boolean {
  let changed = false;
  for (const node of nodes) {
    if (node.kind !== "familyUnit" || node.parentIds.length !== 2) continue;

    const unitPosition = positionById.get(node.id);
    const parentA = positionById.get(node.parentIds[0]);
    const parentB = positionById.get(node.parentIds[1]);
    if (!unitPosition || !parentA || !parentB) continue;

    const centerA = parentA.x + parentA.width / 2;
    const centerB = parentB.x + parentB.width / 2;
    const midpoint = (centerA + centerB) / 2;
    const newX = midpoint - unitPosition.width / 2;
    if (newX === unitPosition.x) continue;

    if (wouldCollide(node.id, newX, positionById)) continue;
    positionById.set(node.id, { ...unitPosition, x: newX });
    changed = true;
  }
  return changed;
}

/**
 * An only child gets ELK's ordinary fan-out treatment even though there's
 * nothing to fan out — the child can end up offset from the family-unit
 * dot above it instead of sitting on a straight line down from it. Runs
 * after `centerTwoParentUnits`, so an only child of a two-parent couple
 * ends up centered under the couple too, not just under the dot.
 */
function centerSoleChildren(graph: FamilyGraph, positionById: Map<string, PositionedNode>): boolean {
  let changed = false;
  const childrenByUnit = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "unitToChild") continue;
    const children = childrenByUnit.get(edge.source) ?? [];
    children.push(edge.target);
    childrenByUnit.set(edge.source, children);
  }

  // Every person's OWN spouse candidates, from every two-parent union they
  // belong to (as a parent) — used below to find whichever one is actually
  // sitting right beside them at the same row (their real visual partner;
  // see the doc comment further down for why this matters).
  const spouseCandidatesOf = new Map<string, string[]>();
  for (const node of graph.nodes) {
    if (node.kind !== "familyUnit" || node.parentIds.length !== 2) continue;
    const [a, b] = node.parentIds;
    spouseCandidatesOf.set(a, [...(spouseCandidatesOf.get(a) ?? []), b]);
    spouseCandidatesOf.set(b, [...(spouseCandidatesOf.get(b) ?? []), a]);
  }

  for (const [unitId, childIds] of childrenByUnit) {
    if (childIds.length !== 1) continue;

    const unitPosition = positionById.get(unitId);
    const childPosition = positionById.get(childIds[0]);
    if (!unitPosition || !childPosition) continue;

    const unitCenterX = unitPosition.x + unitPosition.width / 2;

    // The child may have their own spouse sitting right beside them at
    // the same layer (they're a married-in-turn couple themselves) — the
    // connector targets the *child's* box specifically (the spouse isn't
    // a sibling, just married in), so it's the child's own center that
    // needs to land under the dot, not the couple's shared midpoint
    // (already the case as often as not, leaving the line kinked all the
    // same — real bug report, Мария Сидоровна Кисель's line down to her
    // daughter Галина, married to Павел Лыков, never straightened).
    // Recentering the child alone, without shifting that partner by the
    // same amount, would instead shove the child straight into them —
    // silently blocked by `wouldCollide`, which is exactly why the old
    // single-box version of this function could never fix this case.
    const spouseId = (spouseCandidatesOf.get(childIds[0]) ?? []).find((candidateId) => {
      const candidate = positionById.get(candidateId);
      return candidate && candidate.y === childPosition.y;
    });
    const spousePosition = spouseId ? positionById.get(spouseId) : undefined;

    if (spouseId && spousePosition) {
      const childCenterX = childPosition.x + childPosition.width / 2;
      const delta = unitCenterX - childCenterX;
      if (delta === 0) continue;

      const newChildX = childPosition.x + delta;
      const newSpouseX = spousePosition.x + delta;
      const excludeEachOther = new Set([childIds[0], spouseId]);
      if (wouldCollide(childIds[0], newChildX, positionById, excludeEachOther)) continue;
      if (wouldCollide(spouseId, newSpouseX, positionById, excludeEachOther)) continue;

      positionById.set(childIds[0], { ...childPosition, x: newChildX });
      positionById.set(spouseId, { ...spousePosition, x: newSpouseX });
      changed = true;
      continue;
    }

    const newX = unitCenterX - childPosition.width / 2;
    if (newX === childPosition.x) continue;
    if (wouldCollide(childIds[0], newX, positionById)) continue;
    positionById.set(childIds[0], { ...childPosition, x: newX });
    changed = true;
  }
  return changed;
}
