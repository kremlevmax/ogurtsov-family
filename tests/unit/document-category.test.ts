import { describe, expect, it } from "vitest";
import { resolveDocumentCategory, UNCATEGORIZED_LABEL } from "@/lib/validation/document-category";

describe("resolveDocumentCategory", () => {
  it("returns a recognized category as-is", () => {
    expect(resolveDocumentCategory("Письма")).toBe("Письма");
  });

  it("falls back to the uncategorized label for null", () => {
    expect(resolveDocumentCategory(null)).toBe(UNCATEGORIZED_LABEL);
  });

  it("falls back to the uncategorized label for an unrecognized value", () => {
    expect(resolveDocumentCategory("Что-то незнакомое")).toBe(UNCATEGORIZED_LABEL);
  });
});
