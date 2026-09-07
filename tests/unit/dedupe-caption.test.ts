import { describe, expect, it } from "vitest";
import { dedupeLeadingRepeat } from "@/lib/media/dedupe-caption";

describe("dedupeLeadingRepeat", () => {
  it("strips a caption's leading words when they match the title's", () => {
    const title = "Метрическая запись о рождении Дарьи Гавриловны Огурцовой 13 апреля 1877 года";
    const caption = "Метрическая запись о рождении Казанской церкви села Михайловское, 1877г.";
    expect(dedupeLeadingRepeat(title, caption)).toBe("Казанской церкви села Михайловское, 1877г.");
  });

  it("leaves the caption alone when only a couple of words match", () => {
    const title = "Метрическая запись о браке";
    const caption = "Метрическая запись хранится в архиве";
    expect(dedupeLeadingRepeat(title, caption)).toBe(caption);
  });

  it("leaves the caption alone when nothing matches", () => {
    const title = "Свидетельство о рождении";
    const caption = "Найдено в семейном архиве";
    expect(dedupeLeadingRepeat(title, caption)).toBe(caption);
  });

  it("falls back to the full caption if the whole thing was a repeat", () => {
    const title = "Метрическая запись о рождении";
    const caption = "метрическая запись о рождении";
    expect(dedupeLeadingRepeat(title, caption)).toBe(caption);
  });

  it("ignores case and trailing punctuation when matching words", () => {
    const title = "Запись о рождении Ивана Петровича Сидорова";
    const caption = "запись о рождении Ивана Петровича, сына крестьянина";
    // Matches all 5 words ("Петровича," normalizes to "петровича"), but
    // the remainder after that ("сына крестьянина") starts lowercase, so
    // it backs off one word to the capitalized "Петровича,".
    expect(dedupeLeadingRepeat(title, caption)).toBe("Петровича, сына крестьянина");
  });

  it("never leaves a lowercase, mid-clause fragment — the real bug report", () => {
    // The word-for-word match runs into "венчании"/"браке" — trimming
    // there would leave "браке Казанской церкви…", which reads like the
    // caption itself got cut off mid-word. Falls back to the full
    // caption instead of showing a fragment that looks broken.
    const title = "Метрическая запись о венчании Сафрона Гавриловича Огурцова";
    const caption = "Метрическая запись о браке Казанской церкви села Михайловское";
    expect(dedupeLeadingRepeat(title, caption)).toBe(caption);
  });

  it("backs off to an earlier shared word when the longest match would end lowercase", () => {
    const title = "Запись о рождении Ивана Петровича Сидорова";
    const caption = "Запись о рождении Ивана хранится в архиве Сидоровых";
    // The full 4-word match ("Запись о рождении Ивана") leaves
    // "хранится…" (lowercase) — backs off to the 3-word match instead,
    // whose remainder starts with the capitalized "Ивана".
    expect(dedupeLeadingRepeat(title, caption)).toBe("Ивана хранится в архиве Сидоровых");
  });
});
