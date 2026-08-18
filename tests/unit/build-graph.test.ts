import { describe, expect, it } from "vitest";
import { buildFamilyGraph, type TreePerson, type TreeRelationship } from "@/features/tree/build-graph";

function person(id: string, overrides: Partial<TreePerson> = {}): TreePerson {
  return {
    id,
    displayName: id,
    shortName: id,
    birthYear: null,
    deathYear: null,
    isDeceased: false,
    isPlaceholder: false,
    photoUrl: null,
    ...overrides,
  };
}

describe("buildFamilyGraph", () => {
  it("creates one family unit for two parents and links both children to it", () => {
    const people = [person("mother"), person("father"), person("child-a"), person("child-b")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "mother", toPersonId: "child-a", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "father", toPersonId: "child-a", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "mother", toPersonId: "child-b", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "father", toPersonId: "child-b", relationshipType: "biological_parent" },
    ];

    const graph = buildFamilyGraph(people, relationships);
    const unitNodes = graph.nodes.filter((node) => node.kind === "familyUnit");

    expect(unitNodes).toHaveLength(1);
    expect(unitNodes[0].parentIds.sort()).toEqual(["father", "mother"]);

    const unitToChildEdges = graph.edges.filter((edge) => edge.kind === "unitToChild");
    expect(unitToChildEdges.map((edge) => edge.target).sort()).toEqual(["child-a", "child-b"]);
  });

  it("supports a single known parent (placeholder co-parent unknown)", () => {
    const people = [person("father", { isPlaceholder: false }), person("child")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "father", toPersonId: "child", relationshipType: "biological_parent" },
    ];

    const graph = buildFamilyGraph(people, relationships);
    const unitNodes = graph.nodes.filter((node) => node.kind === "familyUnit");

    expect(unitNodes).toHaveLength(1);
    expect(unitNodes[0].parentIds).toEqual(["father"]);
  });

  it("creates a family unit for a childless couple so the partner link still renders", () => {
    const people = [person("a"), person("b")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "a", toPersonId: "b", relationshipType: "spouse" },
    ];

    const graph = buildFamilyGraph(people, relationships);
    const unitNodes = graph.nodes.filter((node) => node.kind === "familyUnit");

    expect(unitNodes).toHaveLength(1);
    expect(graph.edges.filter((edge) => edge.kind === "unitToChild")).toHaveLength(0);
    expect(graph.edges.filter((edge) => edge.kind === "parentToUnit")).toHaveLength(2);
  });

  it("keeps a former spouse's shared child in a separate unit from the current spouse", () => {
    const people = [person("parent"), person("ex"), person("current"), person("child-with-ex"), person("child-with-current")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "parent", toPersonId: "ex", relationshipType: "former_spouse" },
      { id: "r2", fromPersonId: "parent", toPersonId: "child-with-ex", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "ex", toPersonId: "child-with-ex", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "parent", toPersonId: "current", relationshipType: "spouse" },
      { id: "r5", fromPersonId: "parent", toPersonId: "child-with-current", relationshipType: "biological_parent" },
      { id: "r6", fromPersonId: "current", toPersonId: "child-with-current", relationshipType: "biological_parent" },
    ];

    const graph = buildFamilyGraph(people, relationships);
    const unitNodes = graph.nodes.filter((node) => node.kind === "familyUnit");

    expect(unitNodes).toHaveLength(2);
  });

  it("includes every person as a node even without relationships", () => {
    const people = [person("lonely")];
    const graph = buildFamilyGraph(people, []);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it("records which recorded partnership formed each family unit, for layout ordering", () => {
    const people = [person("parent"), person("ex"), person("current"), person("child-with-ex"), person("child-with-current")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "parent", toPersonId: "ex", relationshipType: "former_spouse" },
      { id: "r2", fromPersonId: "parent", toPersonId: "child-with-ex", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "ex", toPersonId: "child-with-ex", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "parent", toPersonId: "current", relationshipType: "spouse" },
      { id: "r5", fromPersonId: "parent", toPersonId: "child-with-current", relationshipType: "biological_parent" },
      { id: "r6", fromPersonId: "current", toPersonId: "child-with-current", relationshipType: "biological_parent" },
    ];

    const graph = buildFamilyGraph(people, relationships);
    const units = graph.nodes.filter((node) => node.kind === "familyUnit");
    const exUnit = units.find((unit) => unit.parentIds.includes("ex"));
    const currentUnit = units.find((unit) => unit.parentIds.includes("current"));

    expect(exUnit?.partnerType).toBe("former_spouse");
    expect(currentUnit?.partnerType).toBe("spouse");
  });

  it("leaves a shared-parentage-only unit's partnerType null when no partner relationship is on record", () => {
    const people = [person("mother"), person("father"), person("child")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "mother", toPersonId: "child", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "father", toPersonId: "child", relationshipType: "biological_parent" },
    ];

    const graph = buildFamilyGraph(people, relationships);
    const unit = graph.nodes.find((node) => node.kind === "familyUnit");

    expect(unit?.partnerType).toBeNull();
  });
});
