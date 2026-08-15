import type { Edge, Node } from "@xyflow/react";
import { buildFamilyGraph, type FamilyGraphNode, type TreePerson, type TreeRelationship } from "./build-graph";
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

    positionById.set(node.id, { ...unitPosition, x: midpoint - unitPosition.width / 2 });
  }
}
