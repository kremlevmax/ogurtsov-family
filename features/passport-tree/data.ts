import type { PassportTreeData } from "./types";

/**
 * Ported verbatim from PassportTree/06_Техническая_документация/
 * passport-tree.json (owner's mother's approved data, cross-checked
 * against 03_Данные_родословной.md — both agree). `page.note.text` is
 * `null`/`status: "requires_clarification"` in the source on purpose:
 * the final wording of the "Примечания" block was not yet approved
 * when this data was handed off (see docs/DECISIONS.md).
 *
 * The approved mockup PNG (public/passport/base-artwork.png) still
 * shows an older caption reading "Игнат — приёмник" for this same
 * fact — 03_Данные_родословной.md and this JSON both say
 * "восприемник" (a baptism sponsor, not "приёмник"/receiver) and are
 * the authoritative text source per PassportTree's own rule ("макет
 * определяет дизайн, а текстовые данные — содержание"); the mismatch
 * is exactly why the real text here is drawn over that part of the
 * artwork rather than left showing through.
 */
export const PASSPORT_TREE_DATA: PassportTreeData = {
  schemaVersion: "1.0.0",
  page: {
    title: "Паспорт родословного дерева Огурцовых",
    note: {
      heading: "Примечание",
      text: null,
      status: "requires_clarification",
    },
  },
  people: [
    {
      id: "emelyan",
      name: "Емельян Максимов",
      life: { label: "1663", startYear: 1663, endYear: null },
      documentIds: ["rev1"],
      note: null,
    },
    {
      id: "fedor",
      name: "Федор Емельянов",
      life: { label: "1703–1781", startYear: 1703, endYear: 1781 },
      documentIds: ["rev1", "rev2", "rev3", "rev4"],
      note: null,
    },
    {
      id: "mikhail",
      name: "Михаил Федоров",
      life: { label: "1736–1797", startYear: 1736, endYear: 1797 },
      documentIds: ["rev2", "rev3", "rev4", "rev6"],
      note: null,
    },
    {
      id: "egor_m",
      name: "Егор Михайлов",
      life: { label: "1764–1805", startYear: 1764, endYear: 1805 },
      documentIds: ["rev4", "rev6"],
      note: null,
    },
    {
      id: "egor_e",
      name: "Егор Егоров",
      life: { label: "1803–1859", startYear: 1803, endYear: 1859 },
      documentIds: ["rev6", "rev7", "rev8"],
      note: null,
    },
    {
      id: "gavrila",
      name: "Гаврила Егоров",
      life: { label: "1833–1912", startYear: 1833, endYear: 1912 },
      documentIds: ["rev9", "rev10", "death1912"],
      note: null,
    },
    {
      id: "ignat",
      name: "Игнат Гаврилов",
      life: { label: "1867", startYear: 1867, endYear: null },
      documentIds: ["birth_alexander1915"],
      note: "Игнат — восприемник",
    },
    {
      id: "safron",
      name: "Сафрон Гаврилов",
      life: { label: "1873", startYear: 1873, endYear: null },
      documentIds: ["birth1873"],
      note: null,
    },
    {
      id: "stepan",
      name: "Степан Гаврилов",
      life: { label: "1881–1942", startYear: 1881, endYear: 1942 },
      documentIds: ["birth1881"],
      note: null,
    },
  ],
  documents: [
    { id: "rev1", title: "I ревизия", dates: { label: "1719–1727", startYear: 1719, endYear: 1727 }, url: null },
    { id: "rev2", title: "II ревизия", dates: { label: "1748", startYear: 1748, endYear: 1748 }, url: null },
    { id: "rev3", title: "III ревизия", dates: { label: "1761–1767", startYear: 1761, endYear: 1767 }, url: null },
    { id: "rev4", title: "IV ревизия", dates: { label: "1782", startYear: 1782, endYear: 1782 }, url: null },
    { id: "rev6", title: "VI ревизия", dates: { label: "1811", startYear: 1811, endYear: 1811 }, url: null },
    { id: "rev7", title: "VII ревизия", dates: { label: "1816", startYear: 1816, endYear: 1816 }, url: null },
    { id: "rev8", title: "VIII ревизия", dates: { label: "1834", startYear: 1834, endYear: 1834 }, url: null },
    { id: "rev9", title: "IX ревизия", dates: null, url: null },
    { id: "rev10", title: "X ревизия", dates: { label: "1858", startYear: 1858, endYear: 1858 }, url: null },
    {
      id: "death1912",
      title: "Метрическая запись о смерти",
      dates: { label: "1912", startYear: 1912, endYear: 1912 },
      url: null,
    },
    {
      id: "birth_alexander1915",
      title: "Метрическая запись рождения внука Александра",
      dates: { label: "1915", startYear: 1915, endYear: 1915 },
      url: null,
    },
    {
      id: "birth1873",
      title: "Метрическая запись о рождении",
      dates: { label: "1873", startYear: 1873, endYear: 1873 },
      url: null,
    },
    {
      id: "birth1881",
      title: "Метрическая запись о рождении",
      dates: { label: "1881", startYear: 1881, endYear: 1881 },
      url: null,
    },
  ],
  trunk: ["emelyan", "fedor", "mikhail", "egor_m", "egor_e", "gavrila"],
  relationships: [
    { from: "emelyan", to: "fedor" },
    { from: "fedor", to: "mikhail" },
    { from: "mikhail", to: "egor_m" },
    { from: "egor_m", to: "egor_e" },
    { from: "egor_e", to: "gavrila" },
    { from: "gavrila", to: "ignat" },
    { from: "gavrila", to: "safron" },
    { from: "gavrila", to: "stepan" },
  ],
  terminalBranches: [
    { id: "moscow", personId: "ignat", label: "Московская ветвь", styleKey: "terminal" },
    { id: "desc_safron", personId: "safron", label: "Потомки", styleKey: "terminal" },
    { id: "desc_stepan", personId: "stepan", label: "Потомки", styleKey: "terminal" },
  ],
};
