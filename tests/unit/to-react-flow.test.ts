import { describe, expect, it } from "vitest";
import type { TreePerson, TreeRelationship } from "@/features/tree/build-graph";
import { buildReactFlowGraph, type FamilyUnitNodeData } from "@/features/tree/to-react-flow";

function person(id: string): TreePerson {
  return {
    id,
    displayName: id,
    shortName: id,
    birthYear: null,
    deathYear: null,
    isDeceased: false,
    isPlaceholder: false,
    photoUrl: null,
    branchColor: null,
    highlightColor: null,
  };
}

describe("buildReactFlowGraph", () => {
  it("ties a childless couple directly to each other instead of through their (invisible) family-unit dot", async () => {
    // Real bug report: Наталья Ивановна Огурцова and Егор Егорович
    // Огурцов are married with no children of their own (his children
    // are from an earlier marriage). Routing both connector lines into
    // the shared dot — as a couple with children does — always left a
    // visible trace of that dot's position (smoothstep bends both edges
    // at the same height, reading as one bar with a stub-like kink where
    // they meet). A direct edge between the two cards has no such
    // artifact and no third point to leave a trace of.
    const people = [person("egor"), person("natalya")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "egor", toPersonId: "natalya", relationshipType: "spouse" },
    ];

    const { nodes, edges } = await buildReactFlowGraph(people, relationships);

    const unitNode = nodes.find((node) => node.type === "familyUnit");
    expect(unitNode).toBeDefined();
    expect((unitNode!.data as FamilyUnitNodeData).hasChildren).toBe(false);

    // One direct tie between the two people — nothing routes into the unit dot.
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("parentTie");
    expect(edges[0].targetHandle).toBe("bottom");
    expect([edges[0].source, edges[0].target].sort()).toEqual(["egor", "natalya"]);
  });

  it("marks a couple who do have a child together hasChildren: true, plus the usual unitToChild edge", async () => {
    const people = [person("egor"), person("matrena"), person("gavrila")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "egor", toPersonId: "matrena", relationshipType: "spouse" },
      { id: "r2", fromPersonId: "egor", toPersonId: "gavrila", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "matrena", toPersonId: "gavrila", relationshipType: "biological_parent" },
    ];

    const { nodes, edges } = await buildReactFlowGraph(people, relationships);

    const unitNode = nodes.find((node) => node.type === "familyUnit");
    expect((unitNode!.data as FamilyUnitNodeData).hasChildren).toBe(true);
    // parentToUnit (x2) + unitToChild (x1).
    expect(edges).toHaveLength(3);
    // Both parentToUnit edges use the same custom "parentTie" edge a
    // childless couple's direct tie does, so every union's bend height
    // comes from the same formula everywhere in the tree — never stock
    // "smoothstep", which the real bug traced back to two unions on the
    // same row bending at different heights.
    const unitToChildEdge = edges.find((edge) => edge.target === "gavrila")!;
    const parentToUnitEdges = edges.filter((edge) => edge.id !== unitToChildEdge.id);
    expect(parentToUnitEdges.every((edge) => edge.type === "parentTie")).toBe(true);
    expect(unitToChildEdge.type).toBe("smoothstep");
  });

  it("still seats a childless spouse right next to their partner", async () => {
    const people = [person("egor"), person("natalya")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "egor", toPersonId: "natalya", relationshipType: "spouse" },
    ];

    const { nodes } = await buildReactFlowGraph(people, relationships);

    const egor = nodes.find((n) => n.id === "egor")!;
    const natalya = nodes.find((n) => n.id === "natalya")!;
    expect(Math.abs(egor.position.y - natalya.position.y)).toBe(0);
    expect(Math.abs(egor.position.x - natalya.position.x)).toBeGreaterThan(0);
    expect(Math.abs(egor.position.x - natalya.position.x)).toBeLessThan(400);
  });
});
