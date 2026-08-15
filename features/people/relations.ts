import type { Person, Relationship } from "./types";

export interface ParentLink {
  role: "mother" | "father" | "parent";
  person: Person;
}

export interface PartnerLink {
  type: "spouse" | "former_spouse" | "partner";
  person: Person;
}

const PARENT_TYPES = new Set(["biological_parent", "adoptive_parent", "foster_parent", "guardian"]);
const PARTNER_TYPES = new Set(["spouse", "former_spouse", "partner"]);

function findPerson(people: Person[], id: string): Person | undefined {
  return people.find((person) => person.id === id);
}

export function getParents(
  personId: string,
  people: Person[],
  relationships: Relationship[],
): ParentLink[] {
  return relationships
    .filter((rel) => rel.toPersonId === personId && PARENT_TYPES.has(rel.relationshipType))
    .map((rel) => {
      const person = findPerson(people, rel.fromPersonId);
      if (!person) return null;
      return { role: rel.parentRole ?? "parent", person } satisfies ParentLink;
    })
    .filter((link): link is ParentLink => link !== null);
}

export function getChildren(
  personId: string,
  people: Person[],
  relationships: Relationship[],
): Person[] {
  return relationships
    .filter((rel) => rel.fromPersonId === personId && PARENT_TYPES.has(rel.relationshipType))
    .map((rel) => findPerson(people, rel.toPersonId))
    .filter((person): person is Person => person !== undefined);
}

export function getPartners(
  personId: string,
  people: Person[],
  relationships: Relationship[],
): PartnerLink[] {
  return relationships
    .filter(
      (rel) =>
        PARTNER_TYPES.has(rel.relationshipType) &&
        (rel.fromPersonId === personId || rel.toPersonId === personId),
    )
    .map((rel) => {
      const otherId = rel.fromPersonId === personId ? rel.toPersonId : rel.fromPersonId;
      const person = findPerson(people, otherId);
      if (!person) return null;
      return { type: rel.relationshipType as PartnerLink["type"], person } satisfies PartnerLink;
    })
    .filter((link): link is PartnerLink => link !== null);
}

/** Siblings are derived from shared parents, never stored directly (CLAUDE.md 3.5). */
export function getSiblings(
  personId: string,
  people: Person[],
  relationships: Relationship[],
): Person[] {
  const parentIds = new Set(getParents(personId, people, relationships).map((link) => link.person.id));
  if (parentIds.size === 0) return [];

  const siblingIds = new Set<string>();
  for (const rel of relationships) {
    if (!PARENT_TYPES.has(rel.relationshipType)) continue;
    if (!parentIds.has(rel.fromPersonId)) continue;
    if (rel.toPersonId === personId) continue;
    siblingIds.add(rel.toPersonId);
  }

  return [...siblingIds]
    .map((id) => findPerson(people, id))
    .filter((person): person is Person => person !== undefined);
}

export interface RelationshipDescription {
  relationshipId: string;
  label: string;
  person: Person;
}

const PARENT_ROLE_LABELS: Record<string, string> = { mother: "Мать", father: "Отец", parent: "Родитель" };
const PARTNER_TYPE_LABELS: Record<string, string> = {
  spouse: "Супруг(а)",
  former_spouse: "Бывший(ая) супруг(а)",
  partner: "Партнёр",
};

/**
 * Describes one relationship from `personId`'s point of view — used by
 * the editor's relationship list (CLAUDE.md 12: manage relationships
 * from the person being edited, not raw from/to database language).
 */
export function describeRelationship(
  rel: Relationship,
  personId: string,
  people: Person[],
): RelationshipDescription | null {
  const isFrom = rel.fromPersonId === personId;
  const otherId = isFrom ? rel.toPersonId : rel.fromPersonId;
  const other = findPerson(people, otherId);
  if (!other) return null;

  if (PARENT_TYPES.has(rel.relationshipType)) {
    if (isFrom) {
      return { relationshipId: rel.id, label: "Ребёнок", person: other };
    }
    return {
      relationshipId: rel.id,
      label: PARENT_ROLE_LABELS[rel.parentRole ?? "parent"],
      person: other,
    };
  }

  return {
    relationshipId: rel.id,
    label: PARTNER_TYPE_LABELS[rel.relationshipType] ?? rel.relationshipType,
    person: other,
  };
}
