import type { Edge, Node } from "@xyflow/react";
import {
  buildFamilyGraph,
  type FamilyGraph,
  type FamilyGraphNode,
  type TreePerson,
  type TreeRelationship,
} from "./build-graph";
import { layoutFamilyGraph, type PositionedNode } from "./layout";

export interface PersonNodeData extends Record<string, unknown> {
  person: TreePerson;
}

export interface FamilyUnitNodeData extends Record<string, unknown> {
  parentIds: string[];
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

  centerTwoParentUnits(graph.nodes, positionById);
  centerSoleChildren(graph, positionById);

  const nodes: FamilyFlowNode[] = graph.nodes.map((node) => {
    const position = positionById.get(node.id) ?? { x: 0, y: 0 };

    if (node.kind === "person") {
      return {
        id: node.id,
        type: "person",
        position,
        data: { person: node.person },
      } satisfies Node<PersonNodeData, "person">;
    }

    return {
      id: node.id,
      type: "familyUnit",
      position,
      data: { parentIds: node.parentIds },
    } satisfies Node<FamilyUnitNodeData, "familyUnit">;
  });

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    style: { strokeWidth: 1.5, stroke: "var(--color-fg-muted)" },
  }));

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
): boolean {
  const moved = positionById.get(movedId);
  if (!moved) return true;

  const bottom = moved.y + moved.height + MIN_NODE_GAP;
  const left = newX - MIN_NODE_GAP;
  const right = newX + moved.width + MIN_NODE_GAP;

  for (const [otherId, other] of positionById) {
    if (otherId === movedId) continue;
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
): void {
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

    if (wouldCollide(node.id, newX, positionById)) continue;
    positionById.set(node.id, { ...unitPosition, x: newX });
  }
}

/**
 * An only child gets ELK's ordinary fan-out treatment even though there's
 * nothing to fan out — the child can end up offset from the family-unit
 * dot above it instead of sitting on a straight line down from it. Runs
 * after `centerTwoParentUnits`, so an only child of a two-parent couple
 * ends up centered under the couple too, not just under the dot.
 */
function centerSoleChildren(graph: FamilyGraph, positionById: Map<string, PositionedNode>): void {
  const childrenByUnit = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "unitToChild") continue;
    const children = childrenByUnit.get(edge.source) ?? [];
    children.push(edge.target);
    childrenByUnit.set(edge.source, children);
  }

  for (const [unitId, childIds] of childrenByUnit) {
    if (childIds.length !== 1) continue;

    const unitPosition = positionById.get(unitId);
    const childPosition = positionById.get(childIds[0]);
    if (!unitPosition || !childPosition) continue;

    const unitCenterX = unitPosition.x + unitPosition.width / 2;
    const newX = unitCenterX - childPosition.width / 2;

    // The child may have their own spouse sitting right beside them at
    // the same layer — recentering the child alone (without their family
    // unit / partner in tow) must not shove them into that neighbor.
    if (wouldCollide(childIds[0], newX, positionById)) continue;
    positionById.set(childIds[0], { ...childPosition, x: newX });
  }
}
