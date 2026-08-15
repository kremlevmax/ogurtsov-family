import { describe, expect, it } from "vitest";
import { buildDisplayName, buildShortName } from "@/lib/names/display-name";

describe("buildDisplayName", () => {
  it("joins last, first and middle name", () => {
    expect(
      buildDisplayName({ firstName: "Иван", middleName: "Петрович", lastName: "Огурцов", maidenName: null }),
    ).toBe("Огурцов Иван Петрович");
  });

  it("appends the maiden name in parentheses", () => {
    expect(
      buildDisplayName({
        firstName: "Мария",
        middleName: "Сергеевна",
        lastName: "Огурцова",
        maidenName: "Смирнова",
      }),
    ).toBe("Огурцова Мария Сергеевна (Смирнова)");
  });

  it("omits missing parts instead of leaving blank gaps", () => {
    expect(buildDisplayName({ firstName: "Иван", middleName: null, lastName: null, maidenName: null })).toBe(
      "Иван",
    );
  });

  it("falls back to just the maiden name when nothing else is known", () => {
    expect(
      buildDisplayName({ firstName: "", middleName: null, lastName: null, maidenName: "Смирнова" }),
    ).toBe("(Смирнова)");
  });
});

describe("buildShortName", () => {
  it("joins only first and middle name", () => {
    expect(
      buildShortName({ firstName: "Иван", middleName: "Петрович", lastName: "Огурцов", maidenName: null }),
    ).toBe("Иван Петрович");
  });
});
