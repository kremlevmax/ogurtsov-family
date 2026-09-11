import { describe, expect, it } from "vitest";
import { extractYear, extractYearForSort } from "@/lib/media/extract-year";

describe("extractYear", () => {
  it("finds a plain 4-digit year", () => {
    expect(extractYear("1873")).toBe(1873);
  });

  it("finds a year inside surrounding text", () => {
    expect(extractYear("около 1980")).toBe(1980);
    expect(extractYear("1873г.")).toBe(1873);
    expect(extractYear("конец 1950-х")).toBe(1950);
  });

  it("returns null for text with no plausible year", () => {
    expect(extractYear("неизвестно")).toBeNull();
    expect(extractYear("")).toBeNull();
  });

  it("returns null for null", () => {
    expect(extractYear(null)).toBeNull();
  });
});

describe("extractYearForSort", () => {
  it("prefers date_text over the title", () => {
    expect(extractYearForSort({ dateText: "1980", title: "Фото 1975 года" })).toBe(1980);
  });

  it("falls back to a year embedded in the title when date_text is unset", () => {
    expect(extractYearForSort({ dateText: null, title: "Ревизская сказка деревни Рубежня 1850 года" })).toBe(1850);
  });

  it("returns null when neither has a plausible year", () => {
    expect(extractYearForSort({ dateText: null, title: "Без названия" })).toBeNull();
  });
});
