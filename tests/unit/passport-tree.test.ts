import { describe, expect, it } from "vitest";
import { PASSPORT_TREE_DATA } from "@/features/passport-tree/data";
import { buildConnectors, TRUNK_PERSON_RECTS, BRANCH_PERSON_RECTS, TERMINAL_RECTS } from "@/features/passport-tree/layout";

/**
 * Encodes PassportTree/08_Чек-лист_разработчика.md's "Данные и JSON"
 * checks as automated tests — the counts, order and exact wording
 * ("Игнат — восприемник") are the owner's mother's approved data
 * (03_Данные_родословной.md), not something a future edit should be
 * able to silently drift away from.
 */
describe("PASSPORT_TREE_DATA", () => {
  it("has exactly 9 people, 13 documents, 8 relationships and 3 terminal branches", () => {
    expect(PASSPORT_TREE_DATA.people).toHaveLength(9);
    expect(PASSPORT_TREE_DATA.documents).toHaveLength(13);
    expect(PASSPORT_TREE_DATA.relationships).toHaveLength(8);
    expect(PASSPORT_TREE_DATA.terminalBranches).toHaveLength(3);
  });

  it("has 20 document attachments across all people", () => {
    const total = PASSPORT_TREE_DATA.people.reduce((sum, person) => sum + person.documentIds.length, 0);
    expect(total).toBe(20);
  });

  it("keeps every id unique", () => {
    const personIds = PASSPORT_TREE_DATA.people.map((person) => person.id);
    const documentIds = PASSPORT_TREE_DATA.documents.map((document) => document.id);
    expect(new Set(personIds).size).toBe(personIds.length);
    expect(new Set(documentIds).size).toBe(documentIds.length);
  });

  it("resolves every documentId and relationship endpoint to a real record", () => {
    const personIds = new Set(PASSPORT_TREE_DATA.people.map((person) => person.id));
    const documentIds = new Set(PASSPORT_TREE_DATA.documents.map((document) => document.id));
    for (const person of PASSPORT_TREE_DATA.people) {
      for (const documentId of person.documentIds) expect(documentIds.has(documentId)).toBe(true);
    }
    for (const relationship of PASSPORT_TREE_DATA.relationships) {
      expect(personIds.has(relationship.from)).toBe(true);
      expect(personIds.has(relationship.to)).toBe(true);
    }
  });

  it("keeps the trunk in the approved order, ending at Гаврила Егоров", () => {
    expect(PASSPORT_TREE_DATA.trunk).toEqual(["emelyan", "fedor", "mikhail", "egor_m", "egor_e", "gavrila"]);
  });

  it("branches from Гаврила to exactly Игнат, Сафрон and Степан, left to right", () => {
    const fromGavrila = PASSPORT_TREE_DATA.relationships.filter((relationship) => relationship.from === "gavrila");
    expect(fromGavrila.map((relationship) => relationship.to)).toEqual(["ignat", "safron", "stepan"]);
  });

  it("has no self-relationships or cycles back into the trunk", () => {
    for (const relationship of PASSPORT_TREE_DATA.relationships) {
      expect(relationship.from).not.toBe(relationship.to);
    }
    const trunkSet = new Set(PASSPORT_TREE_DATA.trunk);
    for (const relationship of PASSPORT_TREE_DATA.relationships) {
      if (trunkSet.has(relationship.to)) expect(relationship.from).toBe(PASSPORT_TREE_DATA.trunk[PASSPORT_TREE_DATA.trunk.indexOf(relationship.to) - 1]);
    }
  });

  it("leaves IX revision without an invented year", () => {
    const rev9 = PASSPORT_TREE_DATA.documents.find((document) => document.id === "rev9");
    expect(rev9?.dates).toBeNull();
  });

  it("preserves the approved 'Игнат — восприемник' wording", () => {
    const ignat = PASSPORT_TREE_DATA.people.find((person) => person.id === "ignat");
    expect(ignat?.note).toBe("Игнат — восприемник");
  });

  it("gives all three terminal branches the same styleKey (equal treatment, same calm color)", () => {
    const styleKeys = new Set(PASSPORT_TREE_DATA.terminalBranches.map((branch) => branch.styleKey));
    expect(styleKeys.size).toBe(1);
  });
});

describe("buildConnectors", () => {
  it("connects every trunk step, the three-way split and each branch's card→document→terminal chain", () => {
    const connectors = buildConnectors();
    // 5 trunk links + 1 Гаврила→split stub + 3 × (split→card, card→doc, doc→terminal)
    expect(connectors).toHaveLength(5 + 1 + 3 * 3);
    for (const connector of connectors) {
      expect(connector.y1).toBeGreaterThan(connector.y0);
    }
  });

  it("every measured rect has a positive width and height", () => {
    for (const rects of [TRUNK_PERSON_RECTS, BRANCH_PERSON_RECTS, TERMINAL_RECTS]) {
      for (const rect of Object.values(rects)) {
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      }
    }
  });
});
