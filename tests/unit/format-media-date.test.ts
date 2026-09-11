import { describe, expect, it } from "vitest";
import { formatMediaDate } from "@/lib/media/format";

describe("formatMediaDate", () => {
  it("appends 'г.' after a bare 4-digit year", () => {
    expect(formatMediaDate("1786")).toBe("1786 г.");
  });

  it("leaves a more descriptive value as typed", () => {
    expect(formatMediaDate("около 1980")).toBe("около 1980");
    expect(formatMediaDate("конец 1950-х")).toBe("конец 1950-х");
  });

  it("returns null for null", () => {
    expect(formatMediaDate(null)).toBeNull();
  });
});
