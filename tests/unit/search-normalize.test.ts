import { describe, expect, it } from "vitest";
import { matchesSearchQuery, normalizeSearchText, searchPeople } from "@/features/search/normalize";

describe("normalizeSearchText", () => {
  it("lowercases, folds ё to е, and collapses repeated whitespace", () => {
    expect(normalizeSearchText("  Огурцов  Ёж  ")).toBe("огурцов еж");
  });
});

describe("matchesSearchQuery", () => {
  const person = {
    id: "1",
    firstName: "Мария",
    middleName: null,
    lastName: "Огурцова",
    maidenName: "Смирнова",
    displayName: "Огурцова Мария (Смирнова)",
  };

  it("matches case-insensitively on the last name", () => {
    expect(matchesSearchQuery(person, "огурцова")).toBe(true);
  });

  it("matches on the maiden name", () => {
    expect(matchesSearchQuery(person, "смирнов")).toBe(true);
  });

  it("returns false for an empty query", () => {
    expect(matchesSearchQuery(person, "")).toBe(false);
  });

  it("returns false when nothing matches", () => {
    expect(matchesSearchQuery(person, "кузнецов")).toBe(false);
  });
});

describe("searchPeople", () => {
  const people = [
    { id: "1", firstName: "Анна", middleName: null, lastName: null, maidenName: null, displayName: "Анна" },
    {
      id: "2",
      firstName: "Анна",
      middleName: "Петровна",
      lastName: null,
      maidenName: null,
      displayName: "Анна Петровна",
    },
    { id: "3", firstName: "Иван", middleName: null, lastName: null, maidenName: null, displayName: "Иван" },
  ];

  it("filters out non-matching people", () => {
    const results = searchPeople(people, "анна");
    expect(results.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("returns an empty array for a blank query", () => {
    expect(searchPeople(people, "   ")).toEqual([]);
  });
});
