/**
 * Powers the tree/person-page quick actions («Добавить мать», «Добавить
 * ребёнка», ...): a new person and their relationship to an existing
 * one are created together in one flow (CLAUDE.md 3.6, 12).
 */
export type QuickRelationKind = "mother" | "father" | "parent" | "spouse" | "child";

export interface QuickRelation {
  relationTo: string;
  relationKind: QuickRelationKind;
  relationToName: string;
}

export function quickRelationHint(relation: QuickRelation): string {
  const name = relation.relationToName;
  switch (relation.relationKind) {
    case "mother":
      return `Новый человек будет сохранён как мать для «${name}».`;
    case "father":
      return `Новый человек будет сохранён как отец для «${name}».`;
    case "parent":
      return `Новый человек будет сохранён как родитель для «${name}».`;
    case "spouse":
      return `Новый человек будет сохранён как супруг(а)/партнёр для «${name}».`;
    case "child":
      return `Новый человек будет сохранён как ребёнок для «${name}».`;
  }
}

export interface QuickRelationInput {
  fromPersonId: string;
  toPersonId: string;
  relationshipType: "biological_parent" | "spouse";
  parentRole: "mother" | "father" | "parent" | null;
  note: null;
}

export function buildQuickRelationInput(relation: QuickRelation, newPersonId: string): QuickRelationInput {
  switch (relation.relationKind) {
    case "mother":
    case "father":
    case "parent":
      return {
        fromPersonId: newPersonId,
        toPersonId: relation.relationTo,
        relationshipType: "biological_parent",
        parentRole: relation.relationKind,
        note: null,
      };
    case "spouse":
      return {
        fromPersonId: relation.relationTo,
        toPersonId: newPersonId,
        relationshipType: "spouse",
        parentRole: null,
        note: null,
      };
    case "child":
      return {
        fromPersonId: relation.relationTo,
        toPersonId: newPersonId,
        relationshipType: "biological_parent",
        parentRole: "parent",
        note: null,
      };
  }
}
