/**
 * Pixel geometry for the "Паспорт родословного дерева Огурцовых" SVG,
 * measured directly off the approved mockup PNG
 * (public/passport/base-artwork.png, 1226×1283 — exactly the viewBox
 * PassportTree/07_Структура_SVG.md fixes: "0 0 1226 1283"). Measured by
 * scanning the PNG's pixel data for the dark-green card borders and
 * the sage/cream fill boundaries (not eyeballed), then cross-checked
 * against the mockup image by rendering and comparing overlays.
 *
 * These are the ONLY approved coordinates (07_Структура_SVG.md:
 * "произвольные координаты не считать утверждёнными") — everything
 * below traces an actual edge in the source artwork, nothing is
 * invented spacing.
 */

export const VIEWBOX = { width: 1226, height: 1283 };

/**
 * The artwork's small "ПАСПОРТ РОДОСЛОВНОГО ДЕРЕВА" eyebrow line sits
 * noticeably left of center relative to "Огурцовых" and the tagline
 * below it — measured (x: 378–803, canvas center 613) rather than
 * eyeballed. Covered and redrawn centered on the canvas, in the same
 * gold tone sampled from the artwork's own letters.
 */
export const EYEBROW_RECT: Rect = { x: 300, y: 8, width: 626, height: 34 };
export const EYEBROW_TEXT = "ПАСПОРТ РОДОСЛОВНОГО ДЕРЕВА";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function rectFromEdges(x0: number, y0: number, x1: number, y1: number): Rect {
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * The pixel scan (see the module doc comment) found the darkest core
 * of each border stroke, not its full antialiased width — drawn at
 * that exact edge, the new rect left a sliver of the artwork's own
 * (slightly wider) border showing just outside it, doubling the line.
 * A small uniform overshoot on every side reliably buries the old
 * border under the new fill+stroke instead of re-measuring 21 boxes'
 * antialiasing by hand; checked against the narrowest gaps in the
 * layout (12px between a branch card and its document box) so this
 * never makes two boxes touch.
 */
const BORDER_OVERSHOOT = 3;

function pad(rect: Rect): Rect {
  return {
    x: rect.x - BORDER_OVERSHOOT,
    y: rect.y - BORDER_OVERSHOOT,
    width: rect.width + BORDER_OVERSHOOT * 2,
    height: rect.height + BORDER_OVERSHOOT * 2,
  };
}

/** Shared column for the six trunk person cards + their document callouts. */
const TRUNK_PERSON_X: [number, number] = [452, 704];
const TRUNK_DOC_X: [number, number] = [736, 1046];

/** Top/bottom edges of each trunk card, in trunk order (measured, not evenly spaced — the source isn't either). */
const TRUNK_ROWS: Record<string, [number, number]> = {
  emelyan: [216, 281],
  fedor: [305, 373],
  mikhail: [397, 463],
  egor_m: [486, 551],
  egor_e: [572, 638],
  gavrila: [661, 729],
};

export const TRUNK_PERSON_RECTS: Record<string, Rect> = Object.fromEntries(
  Object.entries(TRUNK_ROWS).map(([id, [y0, y1]]) => [id, pad(rectFromEdges(TRUNK_PERSON_X[0], y0, TRUNK_PERSON_X[1], y1))]),
);

export const TRUNK_DOC_RECTS: Record<string, Rect> = Object.fromEntries(
  Object.entries(TRUNK_ROWS).map(([id, [y0, y1]]) => [id, pad(rectFromEdges(TRUNK_DOC_X[0], y0, TRUNK_DOC_X[1], y1))]),
);

/** Compact multi-revision lines per PassportTree/05_Требования_к_дизайну.md's table — a fixed historical dataset, not derived generically. */
export const TRUNK_DOC_LINES: Record<string, { numbers: string; dates: string; extra?: string; documentIds: string[] }> = {
  emelyan: { numbers: "I ревизия", dates: "(1719–1727)", documentIds: ["rev1"] },
  fedor: {
    numbers: "I, II, III, IV ревизии",
    dates: "(1719–1727; 1748; 1761–1767; 1782)",
    documentIds: ["rev1", "rev2", "rev3", "rev4"],
  },
  mikhail: {
    numbers: "II, III, IV, VI ревизии",
    dates: "(1748; 1761–1767; 1782; 1811)",
    documentIds: ["rev2", "rev3", "rev4", "rev6"],
  },
  egor_m: { numbers: "IV, VI ревизии", dates: "(1782; 1811)", documentIds: ["rev4", "rev6"] },
  egor_e: { numbers: "VI, VII, VIII ревизии", dates: "(1811; 1816; 1834)", documentIds: ["rev6", "rev7", "rev8"] },
  gavrila: {
    numbers: "IX, X ревизии",
    dates: "(X: 1858)",
    extra: "Метрическая запись о смерти (1912)",
    documentIds: ["rev9", "rev10", "death1912"],
  },
};

/** The three branch columns, left to right: Игнат, Сафрон, Степан. */
export const BRANCH_PERSON_RECTS: Record<string, Rect> = {
  ignat: pad(rectFromEdges(210, 798, 440, 866)),
  safron: pad(rectFromEdges(503, 798, 734, 866)),
  stepan: pad(rectFromEdges(798, 798, 1028, 866)),
};

export const BRANCH_DOC_RECTS: Record<string, Rect> = {
  ignat: pad(rectFromEdges(208, 878, 452, 957)),
  safron: pad(rectFromEdges(500, 878, 736, 957)),
  stepan: pad(rectFromEdges(797, 878, 1030, 957)),
};

/** Wrapped the same way the mockup wraps them — "Метрическая запись" never fits the branch-column width on one line at a readable size. Fixed historical dataset, not derived generically (same rationale as TRUNK_DOC_LINES). */
export const BRANCH_DOC_LINES: Record<string, { lines: string[]; note?: string }> = {
  ignat: {
    lines: ["Метрическая запись", "рождения внука", "Александра (1915)"],
    note: "Игнат — восприемник",
  },
  safron: { lines: ["Метрическая запись", "о рождении (1873)"] },
  stepan: { lines: ["Метрическая запись", "о рождении (1881)"] },
};

export const TERMINAL_RECTS: Record<string, Rect> = {
  moscow: pad(rectFromEdges(198, 981, 457, 1050)),
  desc_safron: pad(rectFromEdges(495, 981, 742, 1050)),
  desc_stepan: pad(rectFromEdges(791, 981, 1037, 1050)),
};

/**
 * The whole "Примечания" block, redrawn as real text — patching only
 * the 4th line (its "Гаврилы Егоровича" → "Гаврилы Егорова" fix) left
 * that one line next to three raster ones, and no live CSS font
 * matched the artwork's baked one closely enough for that to look
 * consistent. Text and frame are still the artwork's own placeholder
 * wording pending Q1/Q2 (docs/DECISIONS.md) — item 4 keeps the
 * "Гаврилы Егорова" correction.
 */
export const NOTE_BLOCK_RECT: Rect = rectFromEdges(55, 1102, 1180, 1264);

export const NOTE_HEADING = "Примечания:";
export const NOTE_ITEMS = [
  "В скобках указаны годы жизни (уточняются по документам).",
  "Для каждого перехода приведён основной документ, подтверждающий родственную связь.",
  "Подробные сведения о каждом человеке, включая источники и сканы документов, представлены в персональных карточках на сайте.",
  "Схема отражает основной ствол рода Огурцовых и три современные ветви, идущие от Гаврилы Егорова.",
];

/** The shared horizontal run below Гаврила, before the three arrows split off (07_Структура_SVG.md: "не рисовать трижды с усилением толщины"). */
export const BRANCH_SPLIT_Y = 758;
export const BRANCH_SPLIT_X: [number, number] = [325, 913];

function centerX(rect: Rect): number {
  return rect.x + rect.width / 2;
}

/** Every vertical connector as a simple {x, y0, y1} stub — trunk chain, the branch split's three drops, and each branch's card→document→terminal stubs. */
export function buildConnectors(): { x: number; y0: number; y1: number }[] {
  const trunkOrder = ["emelyan", "fedor", "mikhail", "egor_m", "egor_e", "gavrila"] as const;
  const connectors: { x: number; y0: number; y1: number }[] = [];

  for (let i = 0; i < trunkOrder.length - 1; i++) {
    const from = TRUNK_PERSON_RECTS[trunkOrder[i]];
    const to = TRUNK_PERSON_RECTS[trunkOrder[i + 1]];
    connectors.push({ x: centerX(from), y0: from.y + from.height, y1: to.y });
  }

  const gavrilaRect = TRUNK_PERSON_RECTS.gavrila;
  connectors.push({ x: centerX(gavrilaRect), y0: gavrilaRect.y + gavrilaRect.height, y1: BRANCH_SPLIT_Y });

  for (const id of ["ignat", "safron", "stepan"] as const) {
    const personRect = BRANCH_PERSON_RECTS[id];
    connectors.push({ x: centerX(personRect), y0: BRANCH_SPLIT_Y, y1: personRect.y });

    const docRect = BRANCH_DOC_RECTS[id];
    connectors.push({ x: centerX(personRect), y0: personRect.y + personRect.height, y1: docRect.y });

    const terminalId = id === "ignat" ? "moscow" : id === "safron" ? "desc_safron" : "desc_stepan";
    const terminalRect = TERMINAL_RECTS[terminalId];
    connectors.push({ x: centerX(personRect), y0: docRect.y + docRect.height, y1: terminalRect.y });
  }

  return connectors;
}
