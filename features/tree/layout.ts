import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import type { FamilyGraph, FamilyGraphNode, FamilyUnitGraphNode } from "./build-graph";

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Height bumped 92 -> 104 alongside the "Викторианский альбом" frame
// (docs/DECISIONS.md, 2026-08-20): the frame's inner hairline + corner
// scrolls left too little room for a 2-line wrapped ФИО plus the
// avatar, so long names started crowding into the border. Every
// connector-height formula elsewhere (ROW_GAP, GENERATION_HEIGHT, the
// custom parentTie bend) is computed from this constant rather than a
// hardcoded number, so this is the only place that needs to change.
export const PERSON_NODE_SIZE = { width: 272, height: 104 } as const;
/**
 * Must match the FamilyUnitNode component's actual rendered size
 * (`h-2.5 w-2.5` = 10px) exactly. A mismatch here shifts the node's
 * visual center from where the layout anchored it, making connector
 * lines kink by a few pixels right before reaching the dot.
 */
export const FAMILY_UNIT_NODE_SIZE = { width: 10, height: 10 } as const;

/** Horizontal gap between adjacent sibling columns, in pixels. */
const SLOT_GAP = 36;
/** Pixel width of one horizontal layout "column" — a person box plus the gap to its neighbor. Exported so tests can assert on slot adjacency without hardcoding this arithmetic twice. */
export const SLOT_WIDTH = PERSON_NODE_SIZE.width + SLOT_GAP;
/** Vertical gap between a person row and the family-unit-dot row below it, and between that dot row and the next person row. Exported so to-react-flow.ts can line up a childless couple's direct tie with a normal union's own merge height (see its `directTieUnits` comment). */
export const ROW_GAP = 70;
/**
 * Vertical gap used instead of `ROW_GAP` for a childless union's dot.
 * Paired with the tightened `pathOptions` in `to-react-flow.ts` (small
 * `offset`/`borderRadius`, `stepPosition: 1`) — that combination is what
 * actually keeps the leftover run past the merge point down to just a
 * few px; this gap only needs to be short enough to read as "right below
 * the cards" and long enough (comfortably over 2× that small offset) that
 * the curve doesn't compress into a lopsided kink. See the pathOptions
 * comment for why the two must move together.
 */
const CHILDLESS_UNIT_GAP = 28;
const GENERATION_HEIGHT = PERSON_NODE_SIZE.height + ROW_GAP + FAMILY_UNIT_NODE_SIZE.height + ROW_GAP;

const PARTNER_TYPE_PRIORITY: Record<string, number> = { spouse: 0, partner: 1, former_spouse: 2 };

function partnerPriority(type: FamilyUnitGraphNode["partnerType"]): number {
  if (!type) return 1.5; // shared-parentage-only unit: between "partner" and "former_spouse"
  return PARTNER_TYPE_PRIORITY[type];
}

/**
 * One of a person's marriages, as far as layout is concerned: the
 * spouse (`null` for a single-parent/placeholder union — no box, just a
 * dot), the union's own connector dot, and that union's own children.
 * Every owned marriage a person has — not just their "primary" one —
 * is a `Marriage` on the same `WalkerNode`, so **all** of them
 * participate in the one real d3-hierarchy pass (see `WalkerNode`):
 * this is what replaced the old "bolt a second marriage on afterwards"
 * step, which only ever got a best-effort collision *avoidance*, not
 * d3's actual non-overlap *guarantee*.
 */
interface Marriage {
  spouseId: string | null;
  unitId: string | null;
  children: WalkerNode[];
}

/**
 * One node in the tree handed to d3-hierarchy. Represents a single
 * *person* together with every marriage they own (see `unitOwner`) —
 * each marriage's own children are real d3 children of this same node
 * (see `childrenOf`), so d3's Reingold-Tilford/Buchheim algorithm sees
 * the whole family — primary marriage, second marriage, third — in one
 * pass and finds a single, globally non-overlapping arrangement. Zero
 * marriages: an unmarried leaf. One: today's ordinary couple. Two or
 * more: each additional marriage's spouse box lands beside the person,
 * alternating sides outward from the primary marriage (see
 * `orderedColumns`) — a childless leaf has nothing to protect from
 * this alternation, and a *married* neighbor's own footprint (their own
 * spouse box, in `slots`) is exactly what already keeps d3 from placing
 * two people's boxes on top of each other.
 *
 * `slots` is this column's own width for d3's `separation()` — 1 for
 * the person, plus 1 for every marriage that has a spouse box. It does
 * *not* need to account for descendants: those are real d3 children
 * now, so d3's own contour algorithm sizes them exactly, which is the
 * whole point of this design — no more hand-rolled width estimate that
 * could only ever approximate the real footprint (real bug report:
 * Мария Кисель's second husband, Косолапов, needed room the old
 * estimate under-reserved, landing him seven columns away).
 */
interface WalkerNode {
  personId: string;
  slots: number;
  marriages: Marriage[];
}

/**
 * Family-tree layout built on `d3-hierarchy`'s `tree()` — a direct
 * implementation of the Reingold–Tilford / Walker–Buchheim algorithm,
 * the standard, long-established method for drawing tidy trees with
 * variable-width nodes: bottom-up subtree contours combined with a
 * modifier that's only applied top-down, which is exactly what a
 * hand-rolled "sum the widths, then center" pass keeps getting subtly
 * wrong (centering a wide primary family pulls the anchor away from a
 * second spouse; naive width-summing double-counts shared descendants
 * reachable from two directions). Two things a generic tree algorithm
 * doesn't know about family charts are handled around it instead of
 * inside it:
 *
 * 1. **Generation (row) assignment** — still computed separately via
 *    longest-path relaxation, same as before: a blood descendant's row
 *    is the longest chain of `unitToChild` edges from any root ancestor,
 *    with a married-in spouse (no recorded parents) pulled to match
 *    their blood-line partner's row. d3's own per-node `depth` isn't
 *    used for this, because it would only reflect *one* spanning path
 *    through the graph — see the unit-ownership comment below for why
 *    that's unsafe.
 * 2. **Multiple marriages** — a person can be a "child" for tree
 *    purposes in only one place, so at most one marriage's *anchor* is
 *    reachable as someone else's child; every marriage they themselves
 *    *own*, though, is a `Marriage` entry on their own `WalkerNode` (see
 *    there) — all sharing the one real d3 pass, not bolted on after.
 */
export function computeFamilyTreeLayout(graph: FamilyGraph): PositionedNode[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const unitById = new Map<string, FamilyUnitGraphNode>();
  for (const node of graph.nodes) {
    if (node.kind === "familyUnit") unitById.set(node.id, node);
  }

  const unitsByParent = new Map<string, FamilyUnitGraphNode[]>();
  for (const unit of unitById.values()) {
    for (const parentId of unit.parentIds) {
      const list = unitsByParent.get(parentId) ?? [];
      list.push(unit);
      unitsByParent.set(parentId, list);
    }
  }
  // Current spouse first, former spouse last — determines which
  // marriage is treated as "primary" (its side, chosen via
  // `preferMarriageOver`, anchors where every further marriage
  // alternates outward from — see `orderedColumns`).
  for (const list of unitsByParent.values()) {
    list.sort((a, b) => partnerPriority(a.partnerType) - partnerPriority(b.partnerType));
  }

  const childrenByUnit = new Map<string, FamilyGraphNode[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== "unitToChild") continue;
    const child = nodeById.get(edge.target);
    if (!child) continue;
    const list = childrenByUnit.get(edge.source) ?? [];
    list.push(child);
    childrenByUnit.set(edge.source, list);
  }

  const parentUnitByChild = new Map<string, string>();
  for (const [unitId, children] of childrenByUnit) {
    for (const child of children) {
      if (child.kind === "person") parentUnitByChild.set(child.id, unitId);
    }
  }

  const hasRecordedParents = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.kind === "unitToChild") hasRecordedParents.add(edge.target);
  }

  // --- Generation (row) assignment -----------------------------------
  const depth = new Map<string, number>();
  for (const node of graph.nodes) {
    if (node.kind === "person" && !hasRecordedParents.has(node.id)) depth.set(node.id, 0);
  }
  let changed = true;
  let guard = 0;
  while (changed && guard < graph.nodes.length + 5) {
    changed = false;
    guard += 1;
    for (const unit of unitById.values()) {
      let parentMax: number | undefined;
      for (const parentId of unit.parentIds) {
        const d = depth.get(parentId);
        if (d !== undefined) parentMax = parentMax === undefined ? d : Math.max(parentMax, d);
      }
      if (parentMax === undefined) continue;
      for (const child of childrenByUnit.get(unit.id) ?? []) {
        const candidate = parentMax + 1;
        if ((depth.get(child.id) ?? -Infinity) < candidate) {
          depth.set(child.id, candidate);
          changed = true;
        }
      }
    }
    for (const unit of unitById.values()) {
      let maxD = -Infinity;
      for (const parentId of unit.parentIds) {
        const d = depth.get(parentId);
        if (d !== undefined) maxD = Math.max(maxD, d);
      }
      if (maxD === -Infinity) continue;
      for (const parentId of unit.parentIds) {
        if (hasRecordedParents.has(parentId)) continue;
        if ((depth.get(parentId) ?? -Infinity) < maxD) {
          depth.set(parentId, maxD);
          changed = true;
        }
      }
    }
  }
  function depthOf(personId: string): number {
    return depth.get(personId) ?? 0;
  }

  // --- Unit ownership ---------------------------------------------------
  //
  // Most units have exactly one blood-line parent — theirs is the only
  // side that should ever treat this union as a tree edge. Real
  // genealogies occasionally marry two people who are *each*
  // independently blood-connected to a root via different branches; left
  // unresolved, both sides would build a tree edge down to the same
  // shared descendants. Picking a single deterministic owner — the
  // deeper (more junior) blood line — keeps every union a tree edge from
  // exactly one side.
  const unitOwner = new Map<string, string>();
  for (const unit of unitById.values()) {
    if (unit.parentIds.length === 1) {
      unitOwner.set(unit.id, unit.parentIds[0]);
      continue;
    }
    const [a, b] = unit.parentIds;
    const aBlood = hasRecordedParents.has(a);
    const bBlood = hasRecordedParents.has(b);
    if (aBlood && !bBlood) unitOwner.set(unit.id, a);
    else if (bBlood && !aBlood) unitOwner.set(unit.id, b);
    else if (aBlood && bBlood && depthOf(a) !== depthOf(b)) {
      unitOwner.set(unit.id, depthOf(a) > depthOf(b) ? a : b);
    } else {
      unitOwner.set(unit.id, a < b ? a : b);
    }
  }
  function ownedUnitsOf(personId: string): FamilyUnitGraphNode[] {
    return (unitsByParent.get(personId) ?? []).filter((unit) => unitOwner.get(unit.id) === personId);
  }

  // When *both* sides of a marriage are independently blood-connected
  // but at genuinely different generations (not just an ownership tie —
  // see above), the shallower side would otherwise get claimed first as
  // a plain child in their own, much shallower part of the tree (root
  // processing order has no idea a deep marriage is coming) — spatially
  // nowhere near their spouse's row, with the marriage's connector edge
  // stretching across everything in between to reach them. Two real
  // reports pulled in opposite directions on what to do about it:
  //
  // - Огурцов Сидор Сафронович (four generations deep) married Огурцова
  //   Анна Федоровна — an only child, a Минин by blood, one generation
  //   from her own root. With no siblings to keep together, pulling her
  //   fully into the marriage (rendered next to Сидор, her own parents
  //   realigned above her — see below) has no downside.
  // - Прасковья Трофимовна married Гаврила Егорович, also several
  //   generations deep — but she has two sisters. Pulling *her* out the
  //   same way would leave the sister row broken into two pieces, which
  //   the site owner explicitly did not want; keeping the three sisters
  //   together and letting the marriage edge simply reach further to
  //   connect them was preferred instead — Прасковья just needs to be
  //   the sibling ordered closest to her husband's side (see
  //   `keepWithSiblingsOrderLast` in `buildChildNodes`).
  //
  // So: an only child is excluded from ever being reached as a plain
  // blood child (`buildChildNodes` skips them entirely — see there) and
  // is *only* ever reachable through the marriage, guaranteeing it wins
  // regardless of traversal order. A child *with* siblings stays put.
  const preferMarriageOver = new Set<string>();
  // nonOwnerId -> ownerId, for the "pull the owner's whole subtree up to
  // the sibling row" step further below.
  const keepWithSiblingsOrderLast = new Map<string, string>();
  for (const unit of unitById.values()) {
    if (unit.parentIds.length !== 2) continue;
    const [a, b] = unit.parentIds;
    if (!hasRecordedParents.has(a) || !hasRecordedParents.has(b) || depthOf(a) === depthOf(b)) continue;
    const owner = unitOwner.get(unit.id);
    if (!owner) continue;
    const nonOwner = owner === a ? b : a;
    const ownParentUnitId = parentUnitByChild.get(nonOwner);
    const hasSiblings = (childrenByUnit.get(ownParentUnitId ?? "")?.length ?? 1) > 1;
    if (hasSiblings) keepWithSiblingsOrderLast.set(nonOwner, owner);
    else preferMarriageOver.add(nonOwner);
  }

  // --- Build the d3 tree(s) ----------------------------------------------
  const consumedUnits = new Set<string>();
  const visitedPeople = new Set<string>();
  // Every node ever built, by its own person id — regardless of how
  // deeply nested it ends up (unlike `forestRoot.marriages[0].children`,
  // which only holds *root-level* clusters). Needed to find an owner's
  // node again later to pull their whole subtree up a level — see the
  // row-realignment step near the end.
  const nodeByPersonId = new Map<string, WalkerNode>();

  /**
   * Builds this union's child nodes — skipping (not just no-op'ing) any
   * child already visited elsewhere. `buildPersonNode`'s own guard
   * against re-descending into an already-placed person still returns
   * *some* node object for the caller's `.map()` to use, but embedding
   * that placeholder into the tree at all was the real bug: d3's
   * `root.each()` walks every node it's handed, including one that only
   * exists to satisfy an array shape, so `applyHierarchy` would
   * position it too — overwriting the person's real, already-correct
   * position (elsewhere in the tree) with wherever this phantom slot
   * happened to land. Checked one child at a time, right before
   * building it (not a `.filter()` pass upfront) — an earlier sibling
   * being built can itself mark a later one visited.
   */
  function buildChildNodes(unitId: string): WalkerNode[] {
    // Stable sort: only reorders `keepWithSiblingsOrderLast` members
    // (to the end, so they sit closest to their spouse's side of the
    // tree — see the comment on `preferMarriageOver`); everyone else
    // keeps their original relative order.
    const children = [...(childrenByUnit.get(unitId) ?? [])].sort(
      (a, b) => Number(keepWithSiblingsOrderLast.has(a.id)) - Number(keepWithSiblingsOrderLast.has(b.id)),
    );
    const result: WalkerNode[] = [];
    for (const child of children) {
      if (child.kind !== "person" || visitedPeople.has(child.id)) continue;
      // See `preferMarriageOver` above — this person is reachable here
      // as a plain blood child, but a deep cross-generation marriage
      // needs to claim them instead, so skip rather than visit.
      if (preferMarriageOver.has(child.id)) continue;
      result.push(buildPersonNode(child.id));
    }
    return result;
  }

  function buildPersonNode(personId: string): WalkerNode {
    if (visitedPeople.has(personId)) return { personId, slots: 1, marriages: [] };
    visitedPeople.add(personId);

    const units = ownedUnitsOf(personId).filter((unit) => !consumedUnits.has(unit.id));
    const marriages: Marriage[] = [];
    for (const unit of units) {
      consumedUnits.add(unit.id);
      const rawSpouseId = unit.parentIds.find((id) => id !== personId) ?? null;
      // A spouse who is *already* visited has their own established
      // position elsewhere in the tree (the "diamond" case: someone who
      // is simultaneously a blood descendant via one branch and married
      // in to another — see the unit-ownership comment above). Drawing
      // them a second time here, next to this person, wouldn't just
      // duplicate their box — `applyHierarchy` positions every node by
      // id, so whichever placement runs later would silently overwrite
      // the other's (and everyone else's, since only one of the two
      // positions is ever kept) with an unrelated x from a completely
      // different part of the tree. Rendering this person alone instead
      // — no visible spouse box for this marriage, though the union's
      // children still render normally — is the same "not spatially
      // adjacent" trade-off already accepted for this case, just applied
      // consistently regardless of which side of the marriage gets
      // built first, and regardless of whether it's the primary marriage
      // or a later one.
      const spouseId = rawSpouseId && !visitedPeople.has(rawSpouseId) ? rawSpouseId : null;
      if (spouseId) visitedPeople.add(spouseId);
      const children = buildChildNodes(unit.id);
      marriages.push({ spouseId, unitId: unit.id, children });
    }

    const spouseCount = marriages.filter((m) => m.spouseId !== null).length;
    const node: WalkerNode = { personId, slots: 1 + spouseCount, marriages };
    nodeByPersonId.set(personId, node);
    return node;
  }

  // A person with no recorded parents is either a genuine root ancestor,
  // or married in to someone who *does* have recorded parents (and so
  // belongs several generations down, not at row 0).
  function marriedInOnly(personId: string): boolean {
    if (hasRecordedParents.has(personId)) return false;
    const units = unitsByParent.get(personId) ?? [];
    return units.some((unit) => unit.parentIds.some((id) => id !== personId && hasRecordedParents.has(id)));
  }

  const rootIds = graph.nodes
    .filter(
      (node): node is FamilyGraphNode & { kind: "person" } =>
        node.kind === "person" && !hasRecordedParents.has(node.id) && !marriedInOnly(node.id),
    )
    .map((node) => node.id);

  const forestRoot: WalkerNode = {
    personId: "__forest__",
    slots: 1,
    marriages: [{ spouseId: null, unitId: null, children: [] }],
  };
  const forestChildren = forestRoot.marriages[0].children;
  // Checked one at a time, right before building each — not a `.filter()`
  // pass upfront, which would run entirely before any `buildPersonNode`
  // call had a chance to mark a spouse visited (e.g. a root couple where
  // both partners have no recorded parents: building the first partner
  // must be able to stop the second from also starting its own root).
  for (const id of rootIds) {
    if (!visitedPeople.has(id)) forestChildren.push(buildPersonNode(id));
  }

  // Anyone somehow unreached (shouldn't happen, but never drop a node).
  for (const node of graph.nodes) {
    if (node.kind === "person" && !visitedPeople.has(node.id)) {
      forestChildren.push(buildPersonNode(node.id));
    }
  }

  // --- Left-to-right column ordering (person + every married spouse) ----
  //
  // One label per box: the person themself, or one specific marriage's
  // spouse. The primary marriage (`marriages[0]` that has a spouse)
  // lands immediately beside the person on its designated side (mirrors
  // for a `preferMarriageOver` case, same as always); every further
  // marriage alternates to the *opposite* side, one slot further out
  // than the previous marriage on that same side — flanking, by
  // construction, rather than a preference bolted on after the fact.
  // Shared by the d3 children-accessor (`childrenOf`) and the actual box
  // placement (`applyHierarchy`) so the two can never disagree about
  // which side anyone ends up on.
  interface Column {
    id: string;
    marriage?: Marriage;
  }

  function orderedColumns(personId: string, marriages: Marriage[]): Column[] {
    const withSpouse = marriages.filter((m): m is Marriage & { spouseId: string } => m.spouseId !== null);
    if (withSpouse.length === 0) return [{ id: personId }];
    const primaryOnLeft = preferMarriageOver.has(withSpouse[0].spouseId);
    const left: Marriage[] = [];
    const right: Marriage[] = [];
    withSpouse.forEach((m, i) => {
      const goesRight = i % 2 === 0 !== primaryOnLeft;
      (goesRight ? right : left).push(m);
    });
    return [
      ...left
        .slice()
        .reverse()
        .map((m) => ({ id: m.spouseId as string, marriage: m })),
      { id: personId },
      ...right.map((m) => ({ id: m.spouseId as string, marriage: m })),
    ];
  }

  /**
   * d3's own `children` accessor: every marriage's children, flattened
   * in the same left-to-right order their spouse box will end up in
   * (see `orderedColumns`) — so a marriage's kids fan out on the same
   * side d3 will see the eventual box, keeping its own centering
   * sensible. A spouseless marriage's children (single-parent /
   * placeholder union) have no side of their own to align with; they're
   * injected once, at the person's own column position.
   */
  function childrenOf(node: WalkerNode): WalkerNode[] {
    const columns = orderedColumns(node.personId, node.marriages);
    const spouselessChildren = node.marriages.filter((m) => m.spouseId === null).flatMap((m) => m.children);
    return columns.flatMap((col) => (col.marriage ? col.marriage.children : spouselessChildren));
  }

  // --- Run d3's tidy-tree algorithm --------------------------------------
  function layoutTree(root: WalkerNode): HierarchyPointNode<WalkerNode> {
    const h = hierarchy(root, childrenOf);
    tree<WalkerNode>()
      .nodeSize([SLOT_WIDTH, 1])
      .separation((a, b) => (a.data.slots + b.data.slots) / 2)(h);
    return h as HierarchyPointNode<WalkerNode>;
  }

  const positionById = new Map<string, PositionedNode>();

  function placePersonBox(id: string, centerX: number, row: number): void {
    const x = centerX - PERSON_NODE_SIZE.width / 2;
    positionById.set(id, { id, x, y: row * GENERATION_HEIGHT, width: PERSON_NODE_SIZE.width, height: PERSON_NODE_SIZE.height });
  }

  /**
   * Placed for *any* union with a connector dot — including a
   * single-parent union (placeholder or unknown other parent), which has
   * no spouse box but still needs its dot positioned.
   *
   * A childless union (no `unitToChild` edge at all — a partner-only tie)
   * sits much closer to the parent row than a real parent-child union
   * does. Placed at the standard full `ROW_GAP` depth, its two
   * parentToUnit connector lines still travel all the way down to where
   * a child's connector would normally continue further — reads as a
   * dead-end stub reaching for a child that doesn't exist, even with the
   * dot itself invisible (real bug report: Наталья Ивановна Огурцова и
   * Егор Егорович Огурцов). Pulling the dot up to sit right where the
   * two lines' horizontal jog already happens leaves just a short bridge
   * between the two cards' bottom-centers, with nothing hanging below it.
   */
  function placeUnitDot(unitId: string, anchorId: string, centerX: number): void {
    const rowDepth = depthOf(anchorId);
    const hasChildren = (childrenByUnit.get(unitId)?.length ?? 0) > 0;
    const gap = hasChildren ? ROW_GAP : CHILDLESS_UNIT_GAP;
    positionById.set(unitId, {
      id: unitId,
      x: centerX - FAMILY_UNIT_NODE_SIZE.width / 2,
      y: rowDepth * GENERATION_HEIGHT + PERSON_NODE_SIZE.height + gap,
      width: FAMILY_UNIT_NODE_SIZE.width,
      height: FAMILY_UNIT_NODE_SIZE.height,
    });
  }

  function applyHierarchy(root: HierarchyPointNode<WalkerNode>): void {
    root.each((d) => {
      if (d.data.personId === "__forest__") return;
      const centerX = d.x;
      const row = depthOf(d.data.personId);

      const columns = orderedColumns(d.data.personId, d.data.marriages);
      const boxCount = columns.length;
      const xById = new Map<string, number>();
      columns.forEach((col, index) => {
        const x = centerX + (index - (boxCount - 1) / 2) * SLOT_WIDTH;
        placePersonBox(col.id, x, row);
        xById.set(col.id, x);
      });

      const hostX = xById.get(d.data.personId)!;
      for (const marriage of d.data.marriages) {
        if (!marriage.unitId) continue;
        const spouseX = marriage.spouseId !== null ? xById.get(marriage.spouseId) : undefined;
        const dotX = spouseX !== undefined ? (hostX + spouseX) / 2 : hostX;
        placeUnitDot(marriage.unitId, d.data.personId, dotX);
      }
    });
  }

  applyHierarchy(layoutTree(forestRoot));

  // Occupied [left, right) intervals at each row — used only by the two
  // realignment passes below (a claimed spouse's parents, and a kept
  // sibling group), which still nudge a whole cluster sideways by hand
  // after the fact; everything d3 itself placed is already guaranteed
  // collision-free and never needs this.
  const rowIntervals = new Map<number, { left: number; right: number; id: string }[]>();
  for (const node of graph.nodes) {
    if (node.kind !== "person") continue; // family-unit dots never counted as obstacles, same as before
    const pos = positionById.get(node.id);
    if (!pos) continue;
    const row = Math.round(pos.y / GENERATION_HEIGHT);
    const list = rowIntervals.get(row) ?? [];
    list.push({ left: pos.x, right: pos.x + pos.width, id: node.id });
    rowIntervals.set(row, list);
  }

  // --- Realign a claimed person's own blood parents above them -----------
  //
  // `preferMarriageOver` deliberately pulls someone out of their
  // parents' sibling row so they render next to their spouse instead —
  // but their parents still get built and placed normally (via the
  // ordinary root walk, just with that one child skipped in
  // `buildChildNodes`), landing wherever an unrelated, childless-looking
  // couple happens to fall. The parent→child edge still connects them to
  // wherever their child actually ended up, so left alone it's the exact
  // same long crossing line as before, just from the *other* end. Once
  // every position is final, shift that whole parent cluster as a rigid
  // block so it sits directly above the claimed child instead.
  function collectWalkerIds(node: WalkerNode, ids: Set<string>): void {
    ids.add(node.personId);
    for (const marriage of node.marriages) {
      if (marriage.spouseId) ids.add(marriage.spouseId);
      if (marriage.unitId) ids.add(marriage.unitId);
      for (const child of marriage.children) collectWalkerIds(child, ids);
    }
  }

  for (const claimedId of preferMarriageOver) {
    const parentUnitId = parentUnitByChild.get(claimedId);
    if (!parentUnitId) continue;
    const parentUnit = unitById.get(parentUnitId);
    const unitDotPos = positionById.get(parentUnitId);
    const childPos = positionById.get(claimedId);
    if (!parentUnit || !unitDotPos || !childPos) continue;

    // `unitOwner` (used for *placement* — who builds this unit's children
    // — see above) is a plain tie-break for a childless pair where
    // neither side has recorded parents, unrelated to which of the two
    // actually ended up as the real top-level tree node: that's decided
    // separately, by which one the root walk happened to reach first
    // (see `rootIds`). The other is only ever referenced as a nested
    // marriage `spouseId` and was never given its own entry in
    // `nodeByPersonId` — so find whichever parent *does* have one,
    // instead of trusting `unitOwner` to have picked the same one.
    const anchorId = parentUnit.parentIds.find((id) => nodeByPersonId.has(id));
    const rootNode = anchorId ? forestChildren.find((node) => node.personId === anchorId) : undefined;
    if (!anchorId || !rootNode) continue; // not a root-level cluster — leave whatever placed it alone

    const idsToShift = new Set<string>();
    collectWalkerIds(rootNode, idsToShift);

    // Drop the whole cluster down first, so it sits exactly one row
    // above the claimed child rather than at its own (often much
    // shallower) blood-computed row — otherwise the parent→child edge
    // still spans however many generations separate them, just now a
    // short horizontal jog away from directly above instead of far off
    // to the side. Uses the claimed child's *actual rendered* row
    // (`childPos.y`), not `depthOf(claimedId)` — that's their own true
    // blood depth, and it's exactly the mismatch between that and where
    // they're actually drawn (next to their much-deeper spouse) that
    // this whole realignment exists to paper over.
    const claimedRow = Math.round(childPos.y / GENERATION_HEIGHT);
    const rowShift = claimedRow - 1 - depthOf(anchorId);
    if (rowShift !== 0) {
      for (const id of idsToShift) {
        const pos = positionById.get(id);
        if (pos) pos.y += rowShift * GENERATION_HEIGHT;
      }
    }

    const currentCenterX = unitDotPos.x + unitDotPos.width / 2;
    const targetCenterX = childPos.x + childPos.width / 2;
    const desiredShift = targetCenterX - currentCenterX;
    if (desiredShift === 0) continue;

    // The whole cluster moves as one rigid block, so it can only be
    // pulled as close to directly-above as whatever's already occupying
    // its rows (unrelated to this cluster) allows.
    const rowExtents = new Map<number, { left: number; right: number }>();
    for (const id of idsToShift) {
      if (nodeById.get(id)?.kind !== "person") continue;
      const pos = positionById.get(id);
      if (!pos) continue;
      const row = Math.round(pos.y / GENERATION_HEIGHT);
      const existing = rowExtents.get(row);
      rowExtents.set(row, {
        left: existing ? Math.min(existing.left, pos.x) : pos.x,
        right: existing ? Math.max(existing.right, pos.x + pos.width) : pos.x + pos.width,
      });
    }

    let shift = desiredShift;
    const maxIterations = [...rowExtents.keys()].reduce((sum, row) => sum + (rowIntervals.get(row)?.length ?? 0), 1);
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let adjustedThisPass = false;
      for (const [row, extent] of rowExtents) {
        const intervals = rowIntervals.get(row);
        if (!intervals) continue;
        const left = extent.left + shift;
        const right = extent.right + shift;
        for (const interval of intervals) {
          if (idsToShift.has(interval.id)) continue; // the cluster's own (pre-shift) box, not a real obstacle
          const overlapsInterval = left < interval.right + SLOT_GAP && interval.left - SLOT_GAP < right;
          if (!overlapsInterval) continue;
          if (shift > 0) {
            const maxShift = interval.left - SLOT_GAP - extent.right;
            if (maxShift < shift) {
              shift = Math.max(0, maxShift);
              adjustedThisPass = true;
            }
          } else {
            const minShift = interval.right + SLOT_GAP - extent.left;
            if (minShift > shift) {
              shift = Math.min(0, minShift);
              adjustedThisPass = true;
            }
          }
        }
      }
      if (!adjustedThisPass) break;
    }

    if (shift === 0) continue;
    for (const id of idsToShift) {
      const pos = positionById.get(id);
      if (pos) pos.x += shift;
    }
  }

  // --- Drop a kept sibling group down to the deep spouse's row -----------
  //
  // Real request: rather than pulling Гаврила Егорович's entire (large)
  // descendant subtree up a generation to match his wife's row (risky —
  // that subtree is big enough that *something* along the way likely
  // collides with unrelated content already occupying those rows), move
  // the much smaller sibling group down to *his* row instead. Every
  // sibling in the group moves together, not just the one who's married
  // in — see `preferMarriageOver`'s doc for why keeping them together
  // was the point in the first place.
  const rowShiftGroups = new Map<string, Set<string>>(); // parentUnitId -> nonOwnerIds sharing it
  for (const [nonOwnerId] of keepWithSiblingsOrderLast) {
    const parentUnitId = parentUnitByChild.get(nonOwnerId);
    if (!parentUnitId) continue;
    const group = rowShiftGroups.get(parentUnitId) ?? new Set<string>();
    group.add(nonOwnerId);
    rowShiftGroups.set(parentUnitId, group);
  }

  for (const [parentUnitId, nonOwnerIds] of rowShiftGroups) {
    const siblings = (childrenByUnit.get(parentUnitId) ?? []).filter(
      (c): c is FamilyGraphNode & { kind: "person" } => c.kind === "person",
    );
    if (siblings.length === 0) continue;

    // All siblings share one row today — target row is whichever married
    // spouse's own (deeper) generation this group is being pulled to
    // match. (If more than one sibling married out to a different
    // generation, the deepest wins — better to under-shift a shallower
    // marriage's edge than to place the group somewhere that matches
    // neither.)
    const targetRows = [...nonOwnerIds].map((id) => depthOf(keepWithSiblingsOrderLast.get(id)!));
    const targetRow = Math.max(...targetRows);
    const currentRow = depthOf(siblings[0].id);
    if (targetRow === currentRow) continue;

    const idsToShift = new Set<string>();
    for (const sibling of siblings) {
      const siblingNode = nodeByPersonId.get(sibling.id);
      if (siblingNode) collectWalkerIds(siblingNode, idsToShift);
      else idsToShift.add(sibling.id);
    }

    let minX = Infinity;
    let maxX = -Infinity;
    for (const id of idsToShift) {
      if (nodeById.get(id)?.kind !== "person") continue;
      const pos = positionById.get(id);
      if (!pos) continue;
      minX = Math.min(minX, pos.x);
      maxX = Math.max(maxX, pos.x + pos.width);
    }
    if (!Number.isFinite(minX)) continue;

    // Prefer keeping the same horizontal position; only nudge sideways
    // (in whichever direction is actually open) if the target row is
    // already occupied there by something unrelated.
    let xShift = 0;
    const targetIntervals = rowIntervals.get(targetRow) ?? [];
    const maxIterations = targetIntervals.length + 1;
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let adjustedThisPass = false;
      const left = minX + xShift;
      const right = maxX + xShift;
      for (const interval of targetIntervals) {
        if (idsToShift.has(interval.id)) continue;
        const overlapsInterval = left < interval.right + SLOT_GAP && interval.left - SLOT_GAP < right;
        if (!overlapsInterval) continue;
        // Push whichever way is shorter: clear to the right of this
        // interval, or clear to the left of it.
        const pushRight = interval.right + SLOT_GAP - left;
        const pushLeft = interval.left - SLOT_GAP - right;
        xShift += Math.abs(pushRight) <= Math.abs(pushLeft) ? pushRight : pushLeft;
        adjustedThisPass = true;
      }
      if (!adjustedThisPass) break;
    }

    const yShift = (targetRow - currentRow) * GENERATION_HEIGHT;
    for (const id of idsToShift) {
      const pos = positionById.get(id);
      if (!pos) continue;
      pos.x += xShift;
      pos.y += yShift;
    }

    // The siblings' own parent comes down with them, staying one row
    // above the group's new row — otherwise the parent→children edge
    // would span however many rows the group just skipped.
    const parentUnit = unitById.get(parentUnitId);
    if (!parentUnit) continue;
    const parentIdsToShift = new Set<string>();
    for (const parentPersonId of parentUnit.parentIds) {
      const parentNode = nodeByPersonId.get(parentPersonId);
      if (parentNode) collectWalkerIds(parentNode, parentIdsToShift);
      else parentIdsToShift.add(parentPersonId);
    }
    parentIdsToShift.add(parentUnitId);
    // The parent's own WalkerNode includes this very sibling group as
    // its `children` — `collectWalkerIds` walked right into them, but
    // they were already moved to their final position above. Shifting
    // them a second time here would double it.
    for (const id of idsToShift) parentIdsToShift.delete(id);

    let pMinX = Infinity;
    let pMaxX = -Infinity;
    for (const id of parentIdsToShift) {
      if (nodeById.get(id)?.kind !== "person") continue;
      const pos = positionById.get(id);
      if (!pos) continue;
      pMinX = Math.min(pMinX, pos.x);
      pMaxX = Math.max(pMaxX, pos.x + pos.width);
    }
    if (!Number.isFinite(pMinX)) continue;

    const parentTargetRow = targetRow - 1;
    let pxShift = 0;
    const pIntervals = rowIntervals.get(parentTargetRow) ?? [];
    const pMaxIterations = pIntervals.length + 1;
    for (let iteration = 0; iteration < pMaxIterations; iteration++) {
      let adjustedThisPass = false;
      const left = pMinX + pxShift;
      const right = pMaxX + pxShift;
      for (const interval of pIntervals) {
        // Excludes the sibling group too, not just the parent's own
        // ids: they used to occupy this exact row before being moved
        // down, and their now-stale entry here (`rowIntervals` isn't
        // retroactively updated by that move) would otherwise look like
        // a real obstacle sitting exactly where the parent naturally
        // wants to be — right above where the siblings *used* to be.
        if (parentIdsToShift.has(interval.id) || idsToShift.has(interval.id)) continue;
        const overlapsInterval = left < interval.right + SLOT_GAP && interval.left - SLOT_GAP < right;
        if (!overlapsInterval) continue;
        const pushRight = interval.right + SLOT_GAP - left;
        const pushLeft = interval.left - SLOT_GAP - right;
        pxShift += Math.abs(pushRight) <= Math.abs(pushLeft) ? pushRight : pushLeft;
        adjustedThisPass = true;
      }
      if (!adjustedThisPass) break;
    }

    const currentParentRow = depthOf(parentUnit.parentIds[0]);
    const pYShift = (parentTargetRow - currentParentRow) * GENERATION_HEIGHT;
    for (const id of parentIdsToShift) {
      const pos = positionById.get(id);
      if (!pos) continue;
      pos.x += pxShift;
      pos.y += pYShift;
    }
  }

  return graph.nodes.map((node) => positionById.get(node.id) ?? { id: node.id, x: 0, y: 0, width: 0, height: 0 });
}

/**
 * Computes a top-to-bottom layered layout for a family graph. Ancestors
 * end up above descendants; generation assignment resolves cross-
 * generation marriages via relaxation to a fixpoint, so it cannot hang
 * on the cycles those create.
 */
export async function layoutFamilyGraph(graph: FamilyGraph): Promise<PositionedNode[]> {
  return computeFamilyTreeLayout(graph);
}
