import { describe, expect, it } from "vitest";
import { extractDisplayYear, formatDateValue, formatLifeSpan, type DateValue } from "@/lib/dates/date-value";

describe("formatDateValue", () => {
  it("formats an unknown date", () => {
    const value: DateValue = { precision: "unknown", start: null, end: null, text: null };
    expect(formatDateValue(value)).toBe("дата неизвестна");
  });

  it("formats an exact date with day, month and year", () => {
    const value: DateValue = { precision: "exact", start: "1990-03-05", end: "1990-03-05", text: null };
    expect(formatDateValue(value)).toBe("5 марта 1990");
  });

  it("formats a month-precision date without a day", () => {
    const value: DateValue = { precision: "month", start: "1990-03-01", end: "1990-03-01", text: null };
    expect(formatDateValue(value)).toBe("март 1990");
  });

  it("formats a year-only date without inventing a month or day", () => {
    const value: DateValue = { precision: "year", start: "1990-01-01", end: "1990-01-01", text: null };
    expect(formatDateValue(value)).toBe("1990");
  });

  it("formats an approximate date with 'около'", () => {
    const value: DateValue = { precision: "approximate", start: "1990-01-01", end: "1990-01-01", text: null };
    expect(formatDateValue(value)).toBe("около 1990");
  });

  it("formats a bounded range", () => {
    const value: DateValue = { precision: "range", start: "1985-01-01", end: "1990-01-01", text: null };
    expect(formatDateValue(value)).toBe("1985–1990");
  });

  it("formats an open-ended range with only a start", () => {
    const value: DateValue = { precision: "range", start: "1985-01-01", end: null, text: null };
    expect(formatDateValue(value)).toBe("после 1985");
  });

  it("formats an open-ended range with only an end", () => {
    const value: DateValue = { precision: "range", start: null, end: "1990-01-01", text: null };
    expect(formatDateValue(value)).toBe("до 1990");
  });

  it("appends a free-text note when present", () => {
    const value: DateValue = { precision: "unknown", start: null, end: null, text: "со слов бабушки" };
    expect(formatDateValue(value)).toBe("дата неизвестна (со слов бабушки)");
  });
});

describe("extractDisplayYear", () => {
  it("returns null for an unknown date", () => {
    expect(extractDisplayYear({ precision: "unknown", start: null, end: null, text: null })).toBeNull();
  });

  it("returns the year for a year-precision date", () => {
    expect(
      extractDisplayYear({ precision: "year", start: "1990-01-01", end: "1990-01-01", text: null }),
    ).toBe(1990);
  });
});

describe("formatLifeSpan", () => {
  const birth: DateValue = { precision: "year", start: "1925-01-01", end: "1925-01-01", text: null };
  const death: DateValue = { precision: "year", start: "1990-01-01", end: "1990-01-01", text: null };

  it("formats a full life span", () => {
    expect(formatLifeSpan(birth, death, true)).toBe("1925–1990");
  });

  it("formats a living person as birth year — н.в.", () => {
    expect(formatLifeSpan(birth, null, false)).toBe("1925 — н.в.");
  });

  it("formats an unknown death for a deceased person as birth–?", () => {
    expect(formatLifeSpan(birth, null, true)).toBe("1925–?");
  });

  it("returns null when nothing is known", () => {
    expect(formatLifeSpan(null, null, false)).toBeNull();
  });
});
