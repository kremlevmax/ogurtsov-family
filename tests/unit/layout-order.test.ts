import { describe, expect, it } from "vitest";
import { buildFamilyGraph, type TreePerson, type TreeRelationship } from "@/features/tree/build-graph";
import { computeFamilyTreeLayout, PERSON_NODE_SIZE, SLOT_WIDTH } from "@/features/tree/layout";
import { buildReactFlowGraph } from "@/features/tree/to-react-flow";

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
  };
}

function layout(people: TreePerson[], relationships: TreeRelationship[]) {
  const graph = buildFamilyGraph(people, relationships);
  const positioned = computeFamilyTreeLayout(graph);
  const byId = new Map(positioned.map((node) => [node.id, node]));
  return { graph, byId };
}

/** [left edge, right edge) of a person's node box, in pixels. */
function xRange(byId: Map<string, { x: number }>, id: string): [number, number] {
  const node = byId.get(id);
  if (!node) throw new Error(`no position for ${id}`);
  return [node.x, node.x + PERSON_NODE_SIZE.width];
}

/** Which horizontal layout column (0, 1, 2, ...) a person's box sits in. */
function slotOf(byId: Map<string, { x: number }>, id: string): number {
  const node = byId.get(id);
  if (!node) throw new Error(`no position for ${id}`);
  return Math.round(node.x / SLOT_WIDTH) || 0; // normalize -0 to 0 for toBe() comparisons
}

function overlaps(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && b[0] < a[1];
}

/**
 * Runs the full pipeline (raw layout + the cosmetic collision-safe
 * centering passes in `to-react-flow.ts`) — used only where a test cares
 * about those passes specifically; `computeFamilyTreeLayout` alone
 * already centers correctly via d3's own tree algorithm for everything
 * else.
 */
async function fullLayout(people: TreePerson[], relationships: TreeRelationship[]) {
  const { nodes } = await buildReactFlowGraph(people, relationships);
  return new Map(nodes.map((node) => [node.id, node.position]));
}

describe("computeFamilyTreeLayout", () => {
  it("places a person's current spouse immediately beside them, with no room for a former spouse in between", () => {
    const people = [
      person("lyudmila-first-wife"),
      person("grandparent"),
      person("nikolai"),
      person("marina-current-wife"),
      person("child-with-lyudmila"),
    ];
    const relationships: TreeRelationship[] = [
      { id: "r0", fromPersonId: "grandparent", toPersonId: "nikolai", relationshipType: "biological_parent" },
      { id: "r1", fromPersonId: "nikolai", toPersonId: "lyudmila-first-wife", relationshipType: "former_spouse" },
      {
        id: "r2",
        fromPersonId: "nikolai",
        toPersonId: "child-with-lyudmila",
        relationshipType: "biological_parent",
      },
      {
        id: "r3",
        fromPersonId: "lyudmila-first-wife",
        toPersonId: "child-with-lyudmila",
        relationshipType: "biological_parent",
      },
      { id: "r4", fromPersonId: "nikolai", toPersonId: "marina-current-wife", relationshipType: "spouse" },
    ];

    const { byId } = layout(people, relationships);

    expect(slotOf(byId, "marina-current-wife")).toBe(slotOf(byId, "nikolai") + 1);
  });

  it("keeps the blood relative's box in place and attaches a married-in spouse beside it, regardless of query order", () => {
    const people = [
      person("marina-married-in"),
      person("grandparent"),
      person("nikolai"),
    ];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "grandparent", toPersonId: "nikolai", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "nikolai", toPersonId: "marina-married-in", relationshipType: "spouse" },
    ];

    const { byId } = layout(people, relationships);

    expect(slotOf(byId, "marina-married-in")).toBe(slotOf(byId, "nikolai") + 1);
  });

  it("puts a second marriage on the opposite side instead of piling both onto the same side", () => {
    const people = ["nikolai", "wife-a", "wife-b", "child-with-a", "child-with-b"].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "nikolai", toPersonId: "wife-a", relationshipType: "former_spouse" },
      { id: "r2", fromPersonId: "nikolai", toPersonId: "child-with-a", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "wife-a", toPersonId: "child-with-a", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "nikolai", toPersonId: "wife-b", relationshipType: "spouse" },
      { id: "r5", fromPersonId: "nikolai", toPersonId: "child-with-b", relationshipType: "biological_parent" },
      { id: "r6", fromPersonId: "wife-b", toPersonId: "child-with-b", relationshipType: "biological_parent" },
    ];

    const { byId } = layout(people, relationships);
    const nikolaiSlot = slotOf(byId, "nikolai");

    expect(slotOf(byId, "wife-a")).toBe(nikolaiSlot - 1);
    expect(slotOf(byId, "wife-b")).toBe(nikolaiSlot + 1);
  });

  it("never lets a much larger primary family push the second wife's own children into someone else's row", () => {
    // Real bug report: Сафрон Гаврилович had 6 children with Анна
    // Дмитриевна (his primary marriage) and 2 with Анна Филипповна. The
    // top priority (per the site owner) is that cells never overlap —
    // adjacency to the anchor is a nice-to-have that must yield when a
    // wide primary family and a second marriage's own children would
    // otherwise collide on the same row. Anna Filippovna still stays on
    // the correct (left) side and immediately-adjacent whenever there's
    // room; this test only pins down the harder case where there isn't.
    const people = ["grandparent", "sofron", "anna-d", "anna-f", ...Array.from({ length: 6 }, (_, i) => `d-kid-${i}`), "f-kid-0", "f-kid-1"].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      // Sofron has a recorded parent, same as in the real data — that's
      // what makes him the owner of both marriages instead of an
      // arbitrary tie-break by id (neither wife has recorded parents).
      { id: "r0", fromPersonId: "grandparent", toPersonId: "sofron", relationshipType: "biological_parent" },
      { id: "r1", fromPersonId: "sofron", toPersonId: "anna-d", relationshipType: "spouse" },
      { id: "r2", fromPersonId: "sofron", toPersonId: "anna-f", relationshipType: "spouse" },
      ...Array.from({ length: 6 }, (_, i) => [
        { id: `rd${i}-1`, fromPersonId: "sofron", toPersonId: `d-kid-${i}`, relationshipType: "biological_parent" as const },
        { id: `rd${i}-2`, fromPersonId: "anna-d", toPersonId: `d-kid-${i}`, relationshipType: "biological_parent" as const },
      ]).flat(),
      { id: "rf0-1", fromPersonId: "sofron", toPersonId: "f-kid-0", relationshipType: "biological_parent" },
      { id: "rf0-2", fromPersonId: "anna-f", toPersonId: "f-kid-0", relationshipType: "biological_parent" },
      { id: "rf1-1", fromPersonId: "sofron", toPersonId: "f-kid-1", relationshipType: "biological_parent" },
      { id: "rf1-2", fromPersonId: "anna-f", toPersonId: "f-kid-1", relationshipType: "biological_parent" },
    ];

    const { byId } = layout(people, relationships);
    const sofronSlot = slotOf(byId, "sofron");

    // Anna Filippovna and her two children stay strictly on the left,
    // never crossing into Anna Dmitrievna's side.
    expect(slotOf(byId, "anna-f")).toBeLessThan(sofronSlot);
    expect(slotOf(byId, "f-kid-0")).toBeLessThan(sofronSlot);
    expect(slotOf(byId, "f-kid-1")).toBeLessThan(sofronSlot);

    // No same-row collisions anywhere: every one of Anna Filippovna's
    // people is clear of every one of Anna Dmitrievna's, at whichever
    // rows they actually share.
    const fSideRanges = ["anna-f", "f-kid-0", "f-kid-1"].map((id) => ({ y: byId.get(id)!.y, range: xRange(byId, id) }));
    const dSideRanges = ["anna-d", ...Array.from({ length: 6 }, (_, i) => `d-kid-${i}`)].map((id) => ({
      y: byId.get(id)!.y,
      range: xRange(byId, id),
    }));
    for (const f of fSideRanges) {
      for (const d of dSideRanges) {
        if (f.y !== d.y) continue;
        expect(overlaps(f.range, d.range)).toBe(false);
      }
    }
  });

  it("reserves room in the sibling row for a secondary marriage instead of shoving it far away", () => {
    // Real bug report: Мария Кисель has two husbands — Кисель Николай
    // (primary) and Косолапов Иван Силантьевич (secondary, with their
    // own child). Nothing told Мария's *siblings* to leave room for that
    // second marriage, so when placed it found no free space next to
    // her and got pushed seven columns away hunting for room — with the
    // connector line crossing straight through her sisters' whole row
    // to reach her. A sibling with a secondary marriage needs *more*
    // than the standard 2-slot couple width reserved around them in
    // their own sibling row, sized to fit that marriage's own subtree.
    const people = [
      "grandparent",
      "maria",
      "sister",
      "sister-husband",
      "primary-husband",
      "secondary-husband",
      "secondary-kid",
    ].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r0", fromPersonId: "grandparent", toPersonId: "maria", relationshipType: "biological_parent" },
      { id: "r1", fromPersonId: "grandparent", toPersonId: "sister", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "sister", toPersonId: "sister-husband", relationshipType: "spouse" },
      { id: "r3", fromPersonId: "maria", toPersonId: "primary-husband", relationshipType: "spouse" },
      { id: "r4", fromPersonId: "maria", toPersonId: "secondary-husband", relationshipType: "former_spouse" },
      { id: "r5", fromPersonId: "maria", toPersonId: "secondary-kid", relationshipType: "biological_parent" },
      { id: "r6", fromPersonId: "secondary-husband", toPersonId: "secondary-kid", relationshipType: "biological_parent" },
    ];

    const { byId } = layout(people, relationships);

    // Secondary husband ends up immediately adjacent to Maria (one slot
    // to her left) — not shoved away to dodge her sister's family.
    expect(slotOf(byId, "secondary-husband")).toBe(slotOf(byId, "maria") - 1);
  });

  it("keeps a sibling group contiguous even when one sibling has their own spouse and descendants", () => {
    const people = [
      "nastasya",
      "kid-1",
      "kid-1-husband",
      "kid-1-grandchild",
      "kid-2",
      "kid-3",
    ].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "nastasya", toPersonId: "kid-1", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "nastasya", toPersonId: "kid-2", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "nastasya", toPersonId: "kid-3", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "kid-1", toPersonId: "kid-1-husband", relationshipType: "spouse" },
      { id: "r5", fromPersonId: "kid-1", toPersonId: "kid-1-grandchild", relationshipType: "biological_parent" },
      {
        id: "r6",
        fromPersonId: "kid-1-husband",
        toPersonId: "kid-1-grandchild",
        relationshipType: "biological_parent",
      },
    ];

    const { byId } = layout(people, relationships);
    // kid-1's own column also has to fit their husband beside them — its
    // span covers both.
    const kidSpans: [number, number][] = [
      [Math.min(slotOf(byId, "kid-1"), slotOf(byId, "kid-1-husband")), Math.max(slotOf(byId, "kid-1"), slotOf(byId, "kid-1-husband"))],
      [slotOf(byId, "kid-2"), slotOf(byId, "kid-2")],
      [slotOf(byId, "kid-3"), slotOf(byId, "kid-3")],
    ];

    // No unrelated node's slot could have landed inside any sibling's span.
    kidSpans.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < kidSpans.length; i++) {
      expect(kidSpans[i][0]).toBe(kidSpans[i - 1][1] + 1);
    }
  });

  it("keeps each union's children together instead of interleaving them with half-siblings", () => {
    const people = [
      person("sofron"),
      person("great-grandparent"),
      person("wife-a"),
      person("wife-b"),
      person("a-kid-1"),
      person("a-kid-2"),
      person("b-kid-1"),
      person("b-kid-2"),
      person("b-kid-3"),
    ];
    const relationships: TreeRelationship[] = [
      { id: "r0", fromPersonId: "great-grandparent", toPersonId: "sofron", relationshipType: "biological_parent" },
      { id: "r1", fromPersonId: "sofron", toPersonId: "wife-a", relationshipType: "spouse" },
      { id: "r2", fromPersonId: "sofron", toPersonId: "wife-b", relationshipType: "spouse" },
      ...["a-kid-1", "a-kid-2"].flatMap((kid, i) => [
        { id: `ra${i}-1`, fromPersonId: "sofron", toPersonId: kid, relationshipType: "biological_parent" as const },
        { id: `ra${i}-2`, fromPersonId: "wife-a", toPersonId: kid, relationshipType: "biological_parent" as const },
      ]),
      ...["b-kid-1", "b-kid-2", "b-kid-3"].flatMap((kid, i) => [
        { id: `rb${i}-1`, fromPersonId: "sofron", toPersonId: kid, relationshipType: "biological_parent" as const },
        { id: `rb${i}-2`, fromPersonId: "wife-b", toPersonId: kid, relationshipType: "biological_parent" as const },
      ]),
    ];

    const { byId } = layout(people, relationships);
    const aRanges = ["a-kid-1", "a-kid-2"].map((id) => xRange(byId, id));
    const bRanges = ["b-kid-1", "b-kid-2", "b-kid-3"].map((id) => xRange(byId, id));

    const aSpan: [number, number] = [
      Math.min(...aRanges.map((r) => r[0])),
      Math.max(...aRanges.map((r) => r[1])),
    ];
    const bSpan: [number, number] = [
      Math.min(...bRanges.map((r) => r[0])),
      Math.max(...bRanges.map((r) => r[1])),
    ];

    expect(overlaps(aSpan, bSpan)).toBe(false);
  });

  it("never overlaps two unrelated branches, even when one has a much larger subtree than the other", () => {
    // Real bug report: a small marriage branch (Баребина Анастасия +
    // Савелий) ended up visually on top of a completely unrelated,
    // larger marriage branch (Анна Минина + Сидор) elsewhere in the
    // tree — ELK's own crossing-minimization had no concept of how much
    // width either branch actually needed.
    const people = [
      "root",
      "anastasia",
      "savely",
      "anastasia-kid",
      "sidor",
      "anna",
      "sidor-kid-1",
      "sidor-kid-2",
      "sidor-kid-3",
      "sidor-grandkid",
    ].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "root", toPersonId: "anastasia", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "root", toPersonId: "sidor", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "anastasia", toPersonId: "savely", relationshipType: "spouse" },
      { id: "r4", fromPersonId: "anastasia", toPersonId: "anastasia-kid", relationshipType: "biological_parent" },
      { id: "r5", fromPersonId: "savely", toPersonId: "anastasia-kid", relationshipType: "biological_parent" },
      { id: "r6", fromPersonId: "sidor", toPersonId: "anna", relationshipType: "spouse" },
      ...["sidor-kid-1", "sidor-kid-2", "sidor-kid-3"].flatMap((kid, i) => [
        { id: `rs${i}-1`, fromPersonId: "sidor", toPersonId: kid, relationshipType: "biological_parent" as const },
        { id: `rs${i}-2`, fromPersonId: "anna", toPersonId: kid, relationshipType: "biological_parent" as const },
      ]),
      {
        id: "r7",
        fromPersonId: "sidor-kid-1",
        toPersonId: "sidor-grandkid",
        relationshipType: "biological_parent",
      },
    ];

    const { byId } = layout(people, relationships);
    const anastasiaBranch = ["anastasia", "savely", "anastasia-kid"].map((id) => ({
      y: byId.get(id)!.y,
      range: xRange(byId, id),
    }));
    const sidorBranch = ["sidor", "anna", "sidor-kid-1", "sidor-kid-2", "sidor-kid-3", "sidor-grandkid"].map((id) => ({
      y: byId.get(id)!.y,
      range: xRange(byId, id),
    }));

    // Only nodes on the *same* row can ever visually collide — a wide
    // subtree sharing horizontal space with an unrelated node several
    // rows up or down is normal in a tidy tree layout, not a bug.
    for (const a of anastasiaBranch) {
      for (const b of sidorBranch) {
        if (a.y !== b.y) continue;
        expect(overlaps(a.range, b.range)).toBe(false);
      }
    }
  });

  it("centers a couple with one child directly over that child", async () => {
    const people = ["mother", "father", "only-child"].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "mother", toPersonId: "only-child", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "father", toPersonId: "only-child", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "mother", toPersonId: "father", relationshipType: "spouse" },
    ];

    const byId = await fullLayout(people, relationships);
    const motherCenter = byId.get("mother")!.x + PERSON_NODE_SIZE.width / 2;
    const fatherCenter = byId.get("father")!.x + PERSON_NODE_SIZE.width / 2;
    const childCenter = byId.get("only-child")!.x + PERSON_NODE_SIZE.width / 2;

    expect(childCenter).toBeCloseTo((motherCenter + fatherCenter) / 2, 5);
  });

  it("centers grandparents over the combined width of every child's own descendants", () => {
    // The three-brothers bug report: grandparents (Гаврила + Прасковья)
    // should span the full width their sons' family branches occupy,
    // not just sit above wherever the first son happened to land.
    const people = [
      "grandfather",
      "grandmother",
      "son-a",
      "son-a-wife",
      "son-a-kid-1",
      "son-a-kid-2",
      "son-b",
      "son-b-wife",
      "son-b-kid",
      "son-c",
      "son-c-wife",
    ].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r0", fromPersonId: "grandfather", toPersonId: "grandmother", relationshipType: "spouse" },
      { id: "r1", fromPersonId: "grandfather", toPersonId: "son-a", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "grandmother", toPersonId: "son-a", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "grandfather", toPersonId: "son-b", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "grandmother", toPersonId: "son-b", relationshipType: "biological_parent" },
      { id: "r5", fromPersonId: "grandfather", toPersonId: "son-c", relationshipType: "biological_parent" },
      { id: "r6", fromPersonId: "grandmother", toPersonId: "son-c", relationshipType: "biological_parent" },
      { id: "r7", fromPersonId: "son-a", toPersonId: "son-a-wife", relationshipType: "spouse" },
      { id: "r8", fromPersonId: "son-a", toPersonId: "son-a-kid-1", relationshipType: "biological_parent" },
      { id: "r9", fromPersonId: "son-a-wife", toPersonId: "son-a-kid-1", relationshipType: "biological_parent" },
      { id: "r10", fromPersonId: "son-a", toPersonId: "son-a-kid-2", relationshipType: "biological_parent" },
      { id: "r11", fromPersonId: "son-a-wife", toPersonId: "son-a-kid-2", relationshipType: "biological_parent" },
      { id: "r12", fromPersonId: "son-b", toPersonId: "son-b-wife", relationshipType: "spouse" },
      { id: "r13", fromPersonId: "son-b", toPersonId: "son-b-kid", relationshipType: "biological_parent" },
      { id: "r14", fromPersonId: "son-b-wife", toPersonId: "son-b-kid", relationshipType: "biological_parent" },
      { id: "r15", fromPersonId: "son-c", toPersonId: "son-c-wife", relationshipType: "spouse" },
    ];

    const { byId } = layout(people, relationships);

    // Every son's whole branch is contiguous and non-overlapping.
    const branches: [string, string[]][] = [
      ["son-a", ["son-a", "son-a-wife", "son-a-kid-1", "son-a-kid-2"]],
      ["son-b", ["son-b", "son-b-wife", "son-b-kid"]],
      ["son-c", ["son-c", "son-c-wife"]],
    ];
    const spans = branches.map(([, ids]) => {
      const ranges = ids.map((id) => xRange(byId, id));
      return [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1]))] as [number, number];
    });
    expect(overlaps(spans[0], spans[1])).toBe(false);
    expect(overlaps(spans[1], spans[2])).toBe(false);
    expect(overlaps(spans[0], spans[2])).toBe(false);

    // Grandparents are centered over the full span of all three sons.
    const overallLeft = Math.min(...spans.map((s) => s[0]));
    const overallRight = Math.max(...spans.map((s) => s[1]));
    const grandfatherCenter = byId.get("grandfather")!.x + PERSON_NODE_SIZE.width / 2;
    const grandmotherCenter = byId.get("grandmother")!.x + PERSON_NODE_SIZE.width / 2;
    const coupleCenter = (grandfatherCenter + grandmotherCenter) / 2;
    expect(coupleCenter).toBeCloseTo((overallLeft + overallRight) / 2, -1);
  });

  it("keeps nudging a secondary marriage left past every occupied slot, not just one", () => {
    // Real bug report: Наталья Ивановна (a secondary marriage) ended up
    // placed exactly on top of Прасковья Трофимовна. Her preferred slot
    // (immediately left of her husband) was already occupied by one of
    // three sisters standing right next to that family; nudging left to
    // clear *that* sister landed her exactly on the next sister over.
    // The clamp loop's pass budget was tied to how many *rows* the
    // subtree touched (almost always 1 for a childless secondary
    // spouse), not to how many people she might need to walk past on
    // that one row — so it stopped after a single push, even though the
    // push itself had just introduced a brand new collision.
    const people = ["mother", "sister-1", "sister-2", "sister-3", "husband", "husband-mother"].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "mother", toPersonId: "sister-1", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "mother", toPersonId: "sister-2", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "mother", toPersonId: "sister-3", relationshipType: "biological_parent" },
      // sister-3 marries a man who is independently a blood descendant
      // of an unrelated line, landing his family right next to the
      // three sisters — same "diamond" shape as the real report.
      { id: "r4", fromPersonId: "husband-mother", toPersonId: "husband", relationshipType: "biological_parent" },
      { id: "r5", fromPersonId: "sister-3", toPersonId: "husband", relationshipType: "spouse" },
      // husband's own second marriage is the one that needs to squeeze
      // in beside him, past all three sisters.
      { id: "r6", fromPersonId: "husband", toPersonId: "second-wife", relationshipType: "former_spouse" },
    ];
    people.push(person("second-wife"));

    const { byId } = layout(people, relationships);
    const sisterRanges = ["sister-1", "sister-2", "sister-3"].map((id) => xRange(byId, id));
    const secondWifeRange = xRange(byId, "second-wife");

    for (const sisterRange of sisterRanges) {
      expect(overlaps(secondWifeRange, sisterRange)).toBe(false);
    }
  });

  it("never lets a diamond marriage overwrite the non-owner spouse's sibling-row position", () => {
    // Real bug report: Прасковья Трофимовна is Настасья's daughter *and*
    // married a man (Гаврила) who is independently a blood descendant of
    // a completely different line — a "diamond" reachable from two
    // directions. Unit ownership already picks Гаврила as owner (see the
    // comment on `unitOwner`), so Прасковья renders once, with her
    // sisters. But `buildForUnit` used to render her *again* as
    // Гаврила's spouse box regardless, and `applyHierarchy` positions
    // every node by id — whichever placement ran second in traversal
    // order silently overwrote the other with an x from a completely
    // unrelated part of the tree, landing her on top of her own sister.
    const people = [
      "nastasya",
      "praskovya",
      "sister-1",
      "sister-2",
      "unrelated-grandparent",
      "gavrila",
      "gavrila-kid-1",
      "gavrila-kid-2",
    ].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "nastasya", toPersonId: "praskovya", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "nastasya", toPersonId: "sister-1", relationshipType: "biological_parent" },
      { id: "r3", fromPersonId: "nastasya", toPersonId: "sister-2", relationshipType: "biological_parent" },
      { id: "r4", fromPersonId: "unrelated-grandparent", toPersonId: "gavrila", relationshipType: "biological_parent" },
      { id: "r5", fromPersonId: "praskovya", toPersonId: "gavrila", relationshipType: "spouse" },
      { id: "r6", fromPersonId: "praskovya", toPersonId: "gavrila-kid-1", relationshipType: "biological_parent" },
      { id: "r7", fromPersonId: "gavrila", toPersonId: "gavrila-kid-1", relationshipType: "biological_parent" },
      { id: "r8", fromPersonId: "praskovya", toPersonId: "gavrila-kid-2", relationshipType: "biological_parent" },
      { id: "r9", fromPersonId: "gavrila", toPersonId: "gavrila-kid-2", relationshipType: "biological_parent" },
    ];

    const { byId } = layout(people, relationships);
    const nastasyaKids = ["praskovya", "sister-1", "sister-2"].map((id) => xRange(byId, id));

    // The three sisters occupy three distinct, non-overlapping columns —
    // Praskovya wasn't silently relocated on top of one of them.
    for (let i = 0; i < nastasyaKids.length; i++) {
      for (let j = i + 1; j < nastasyaKids.length; j++) {
        expect(overlaps(nastasyaKids[i], nastasyaKids[j])).toBe(false);
      }
    }
  });

  it("positions a single-parent union's connector dot instead of leaving it at the origin", () => {
    // CLAUDE.md 3.5 explicitly supports an unknown/placeholder parent —
    // that union has only one recorded parent, so its WalkerNode has no
    // spouse box (`slots: 1`) but still needs its dot positioned; that
    // path was only wired up for the two-parent (`slots: 2`) case.
    const people = ["mother", "child"].map((id) => person(id));
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "mother", toPersonId: "child", relationshipType: "biological_parent" },
    ];

    const { graph, byId } = layout(people, relationships);
    const unitNode = graph.nodes.find((n) => n.kind === "familyUnit")!;
    const unitPosition = byId.get(unitNode.id)!;

    // The fallback (never-placed) position is exactly (0, 0) with zero
    // size; a real placement sits strictly below row 0 (between the
    // parent and child rows) and has the connector dot's actual size.
    expect(unitPosition.y).toBeGreaterThan(0);
    expect(unitPosition.width).toBeGreaterThan(0);
  });

  it("still includes every node exactly once", () => {
    const people = [person("a"), person("b"), person("c")];
    const relationships: TreeRelationship[] = [
      { id: "r1", fromPersonId: "a", toPersonId: "c", relationshipType: "biological_parent" },
      { id: "r2", fromPersonId: "b", toPersonId: "c", relationshipType: "biological_parent" },
    ];

    const { graph, byId } = layout(people, relationships);

    expect(byId.size).toBe(graph.nodes.length);
  });
});
