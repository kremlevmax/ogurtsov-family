import { describe, expect, it } from "vitest";
import type { TreePerson, TreeRelationship } from "@/features/tree/build-graph";
import { isBranchRoot, resolveBranchColors } from "@/features/tree/branch-colors";

function person(id: string, branchColor: string | null = null): TreePerson {
  return {
    id,
    displayName: id,
    shortName: id,
    birthYear: null,
    deathYear: null,
    isDeceased: false,
    isPlaceholder: false,
    photoUrl: null,
    branchColor,
    highlightColor: null,
  };
}

describe("resolveBranchColors", () => {
  it("propagates a founder's color to blood descendants across multiple generations", () => {
    const people = [
      person("stepan", "#1a7a6e"),
      person("son"),
      person("grandson"),
    ];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "stepan", toPersonId: "son", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "son", toPersonId: "grandson", relationshipType: "biological_parent" },
    ];

    const resolved = resolveBranchColors(people, relationships);

    expect(resolved.get("stepan")).toBe("#1a7a6e");
    expect(resolved.get("son")).toBe("#1a7a6e");
    expect(resolved.get("grandson")).toBe("#1a7a6e");
  });

  it("never lets a married-in spouse inherit or pass on a branch color", () => {
    const people = [
      person("stepan", "#1a7a6e"),
      person("son"),
      person("son-wife"),
      person("grandchild"),
    ];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "stepan", toPersonId: "son", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "son", toPersonId: "son-wife", relationshipType: "spouse" },
      { id: "r3", fromPersonId: "son", toPersonId: "grandchild", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "son-wife", toPersonId: "grandchild", relationshipType: "biological_parent" },
    ];

    const resolved = resolveBranchColors(people, relationships);

    expect(resolved.get("son-wife")).toBeUndefined();
    // The grandchild still inherits through their blood father, even though their mother carries no color.
    expect(resolved.get("grandchild")).toBe("#1a7a6e");
  });

  it("leaves someone outside every branch with no resolved color", () => {
    const people = [person("stepan", "#1a7a6e"), person("unrelated")];
    const resolved = resolveBranchColors(people, []);

    expect(resolved.get("unrelated")).toBeUndefined();
  });

  it("does not let a founder inherit a color from their own blood parents", () => {
    const people = [person("great-grandparent", "#8f6a1f"), person("parent"), person("stepan", "#1a7a6e")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "great-grandparent", toPersonId: "parent", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "parent", toPersonId: "stepan", relationshipType: "biological_parent" },
    ];

    const resolved = resolveBranchColors(people, relationships);

    // Stepan is his own branch's root — his own color wins over whatever his ancestors carry.
    expect(resolved.get("stepan")).toBe("#1a7a6e");
    expect(resolved.get("parent")).toBe("#8f6a1f");
  });

  it("resolves a child of two different branch founders to one deterministic color, not a crash or a blend", () => {
    const people = [person("mother", "#1a7a6e"), person("father", "#8f6a1f"), person("child")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "mother", toPersonId: "child", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "father", toPersonId: "child", relationshipType: "biological_parent" },
    ];

    const resolved = resolveBranchColors(people, relationships);

    expect(["#1a7a6e", "#8f6a1f"]).toContain(resolved.get("child"));
  });
});

describe("isBranchRoot", () => {
  it("is true only for the literal founder, not their descendants", () => {
    const people = [person("stepan", "#1a7a6e"), person("son")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "stepan", toPersonId: "son", relationshipType: "biological_parent" },
    ];
    const resolved = resolveBranchColors(people, relationships);

    expect(isBranchRoot(people[0], resolved)).toBe(true);
    expect(isBranchRoot(people[1], resolved)).toBe(false);
  });

  it("is false for anyone with no branch at all", () => {
    const solo = person("nobody");
    const resolved = resolveBranchColors([solo], []);

    expect(isBranchRoot(solo, resolved)).toBe(false);
  });
});
