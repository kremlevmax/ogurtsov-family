/**
 * Pure transform: people + relationships -> a tree graph made of person
 * nodes and intermediate family-unit nodes for couples/parent groups.
 * Family-unit nodes exist only to route edges cleanly (CLAUDE.md 5.2)
 * and are never resolvable as real people.
 */

export type RelationshipType =
  | "biological_parent"
  | "adoptive_parent"
  | "foster_parent"
  | "guardian"
  | "spouse"
  | "former_spouse"
  | "partner";

const PARENT_RELATIONSHIP_TYPES: ReadonlySet<RelationshipType> = new Set([
  "biological_parent",
  "adoptive_parent",
  "foster_parent",
  "guardian",
]);

const PARTNER_RELATIONSHIP_TYPES: ReadonlySet<RelationshipType> = new Set([
  "spouse",
  "former_spouse",
  "partner",
]);

export interface TreePerson {
  id: string;
  displayName: string;
  shortName: string;
  birthYear: number | null;
  deathYear: number | null;
  isDeceased: boolean;
  isPlaceholder: boolean;
  photoUrl: string | null;
}

/** Direction convention matches `relationships`: from = parent, to = child. */
export interface TreeRelationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationshipType: RelationshipType;
}

export interface PersonGraphNode {
  id: string;
  kind: "person";
  person: TreePerson;
}

export interface FamilyUnitGraphNode {
  id: string;
  kind: "familyUnit";
  parentIds: string[];
  /** The partner relationship directly on record between the two parents, if any — used only to bias layout ordering (current spouse placed adjacent, former spouse pushed out). Null for a shared-parentage unit with no recorded partnership. */
  partnerType: "spouse" | "former_spouse" | "partner" | null;
}

export type FamilyGraphNode = PersonGraphNode | FamilyUnitGraphNode;

export interface FamilyGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "parentToUnit" | "unitToChild";
}

export interface FamilyGraph {
  nodes: FamilyGraphNode[];
  edges: FamilyGraphEdge[];
}

function familyUnitId(parentIds: string[]): string {
  return `unit:${[...parentIds].sort().join("+")}`;
}

/**
 * Groups children by their exact parent set, and merges in childless
 * couples so partner links still render. A person with only one known
 * parent yields a single-parent family unit rather than being dropped.
 */
export function buildFamilyGraph(
  people: TreePerson[],
  relationships: TreeRelationship[],
): FamilyGraph {
  const personNodes: PersonGraphNode[] = people.map((person) => ({
    id: person.id,
    kind: "person",
    person,
  }));

  // A relationship whose person was deleted without also deleting the
  // relationship (e.g. data left over from before soft-deleting a person
  // cascaded to their relationships) would otherwise still grow a
  // family-unit node with no person box to show at the other end — a
  // dangling stub in the tree. Both ends must be someone actually on
  // screen.
  const livingPersonIds = new Set(people.map((p) => p.id));
  const validRelationships = relationships.filter(
    (rel) => livingPersonIds.has(rel.fromPersonId) && livingPersonIds.has(rel.toPersonId),
  );

  const parentsByChild = new Map<string, Set<string>>();
  for (const rel of validRelationships) {
    if (!PARENT_RELATIONSHIP_TYPES.has(rel.relationshipType)) continue;
    const parents = parentsByChild.get(rel.toPersonId) ?? new Set<string>();
    parents.add(rel.fromPersonId);
    parentsByChild.set(rel.toPersonId, parents);
  }

  const unitParentIds = new Map<string, string[]>();
  const childrenByUnit = new Map<string, string[]>();

  for (const [childId, parents] of parentsByChild) {
    const parentIds = [...parents].sort();
    const unitId = familyUnitId(parentIds);
    unitParentIds.set(unitId, parentIds);
    const children = childrenByUnit.get(unitId) ?? [];
    children.push(childId);
    childrenByUnit.set(unitId, children);
  }

  // "spouse" beats "partner" beats "former_spouse" when a pair somehow has
  // more than one partner-type row on record — only matters for layout bias.
  const PARTNER_TYPE_PRIORITY: Record<string, number> = { spouse: 0, partner: 1, former_spouse: 2 };
  const unitPartnerType = new Map<string, FamilyUnitGraphNode["partnerType"]>();

  for (const rel of validRelationships) {
    if (!PARTNER_RELATIONSHIP_TYPES.has(rel.relationshipType)) continue;
    const parentIds = [rel.fromPersonId, rel.toPersonId].sort();
    const unitId = familyUnitId(parentIds);
    if (!unitParentIds.has(unitId)) {
      unitParentIds.set(unitId, parentIds);
    }
    const existing = unitPartnerType.get(unitId);
    const type = rel.relationshipType as FamilyUnitGraphNode["partnerType"];
    if (!existing || PARTNER_TYPE_PRIORITY[type as string] < PARTNER_TYPE_PRIORITY[existing as string]) {
      unitPartnerType.set(unitId, type);
    }
  }

  const familyUnitNodes: FamilyUnitGraphNode[] = [];
  const edges: FamilyGraphEdge[] = [];

  for (const [unitId, parentIds] of unitParentIds) {
    familyUnitNodes.push({
      id: unitId,
      kind: "familyUnit",
      parentIds,
      partnerType: unitPartnerType.get(unitId) ?? null,
    });

    for (const parentId of parentIds) {
      edges.push({
        id: `${parentId}->${unitId}`,
        source: parentId,
        target: unitId,
        kind: "parentToUnit",
      });
    }

    for (const childId of childrenByUnit.get(unitId) ?? []) {
      edges.push({
        id: `${unitId}->${childId}`,
        source: unitId,
        target: childId,
        kind: "unitToChild",
      });
    }
  }

  return {
    nodes: [...personNodes, ...familyUnitNodes],
    edges,
  };
}
