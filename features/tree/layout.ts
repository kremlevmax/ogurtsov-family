import ELK from "elkjs/lib/elk.bundled.js";
import type { FamilyGraph } from "./build-graph";

const elk = new ELK();

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PERSON_NODE_SIZE = { width: 272, height: 92 } as const;
/**
 * Must match the FamilyUnitNode component's actual rendered size
 * (`h-2.5 w-2.5` = 10px) exactly. A mismatch here shifts the node's
 * visual center from where ELK anchored it, making connector lines
 * kink by a few pixels right before reaching the dot.
 */
export const FAMILY_UNIT_NODE_SIZE = { width: 10, height: 10 } as const;

/**
 * Computes a top-to-bottom layered layout for a family graph via ELK.
 * Ancestors end up above descendants; ELK's layered algorithm resolves
 * cycles internally, so cross-generation marriages cannot hang layout.
 */
export async function layoutFamilyGraph(graph: FamilyGraph): Promise<PositionedNode[]> {
  const elkGraph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "70",
      "elk.spacing.nodeNode": "36",
      "elk.layered.considerModelOrder.strategy": "PREFER_NODES",
    },
    children: graph.nodes.map((node) => {
      const size = node.kind === "person" ? PERSON_NODE_SIZE : FAMILY_UNIT_NODE_SIZE;
      return { id: node.id, width: size.width, height: size.height };
    }),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const result = await elk.layout(elkGraph);

  return (result.children ?? []).map((child) => ({
    id: child.id as string,
    x: child.x ?? 0,
    y: child.y ?? 0,
    width: child.width ?? 0,
    height: child.height ?? 0,
  }));
}
