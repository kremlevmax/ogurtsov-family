/**
 * Resolves which "branch color" each person inherits from a branch-founder
 * ancestor. A branch founder is any person with their own `branchColor` set
 * (`people.branch_color`, CLAUDE.md-style: stored only on the founder, never
 * duplicated onto every descendant). Every other person's color is derived
 * on the fly by walking blood-parent edges up to the nearest ancestor who
 * has one — the same "compute, don't store" approach already used for
 * siblings (`features/people/relations.ts`, `getSiblings`) and family units
 * (`build-graph.ts`). Spouses/partners never carry or pass on a color: only
 * `PARENT_RELATIONSHIP_TYPES` edges are followed.
 */
import { PARENT_RELATIONSHIP_TYPES, type TreePerson, type TreeRelationship } from "./build-graph";

/** personId -> resolved branch color (own color if they're a founder, else the nearest blood ancestor's). Absent = no branch. */
export function resolveBranchColors(
  people: TreePerson[],
  relationships: TreeRelationship[],
): Map<string, string> {
  const ownColorById = new Map(people.map((person) => [person.id, person.branchColor]));

  // Same dangling-reference guard as build-graph.ts: only walk edges
  // between two people actually in this list.
  const livingPersonIds = new Set(people.map((p) => p.id));
  const parentsByChild = new Map<string, string[]>();
  for (const rel of relationships) {
    if (!PARENT_RELATIONSHIP_TYPES.has(rel.relationshipType)) continue;
    if (!livingPersonIds.has(rel.fromPersonId) || !livingPersonIds.has(rel.toPersonId)) continue;
    const parents = parentsByChild.get(rel.toPersonId) ?? [];
    parents.push(rel.fromPersonId);
    parentsByChild.set(rel.toPersonId, parents);
  }

  const resolved = new Map<string, string>();

  function resolve(personId: string, visiting: Set<string>): string | null {
    if (resolved.has(personId)) return resolved.get(personId) ?? null;

    const ownColor = ownColorById.get(personId) ?? null;
    if (ownColor) {
      resolved.set(personId, ownColor);
      return ownColor;
    }

    // Ancestor cycles can't exist in real data (DB trigger
    // prevent_ancestor_cycle()), but this is a pure function that may see
    // arbitrary input (e.g. in tests) — guard anyway rather than trust it.
    if (visiting.has(personId)) return null;
    visiting.add(personId);

    // Deterministic across runs regardless of relationship insertion
    // order: sort parent ids and take the first that resolves to a color.
    const parentIds = [...(parentsByChild.get(personId) ?? [])].sort();
    let inherited: string | null = null;
    for (const parentId of parentIds) {
      inherited = resolve(parentId, visiting);
      if (inherited) break;
    }

    visiting.delete(personId);
    if (inherited) resolved.set(personId, inherited);
    return inherited;
  }

  for (const person of people) resolve(person.id, new Set());

  return resolved;
}

/** True only for the literal founder (their own color, not one inherited from further up). */
export function isBranchRoot(person: TreePerson, resolvedColors: Map<string, string>): boolean {
  return Boolean(person.branchColor) && resolvedColors.get(person.id) === person.branchColor;
}
