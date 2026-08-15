/**
 * Normalizes a name/query string for case-insensitive, ё/е-tolerant
 * matching. Only used for comparison — never overwrites the stored value.
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, "е")
    .trim()
    .replace(/\s+/g, " ");
}

export interface SearchablePerson {
  id: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  maidenName: string | null;
  displayName: string;
}

/** True when the normalized query matches any of the person's name fields. */
export function matchesSearchQuery(person: SearchablePerson, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return false;

  const haystacks = [
    person.firstName,
    person.middleName,
    person.lastName,
    person.maidenName,
    person.displayName,
  ];

  return haystacks.some(
    (field) => field !== null && normalizeSearchText(field).includes(normalizedQuery),
  );
}

/** Filters and ranks people by search relevance (prefix matches first). */
export function searchPeople<T extends SearchablePerson>(people: T[], query: string): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const matches = people.filter((person) => matchesSearchQuery(person, query));

  return matches.sort((a, b) => {
    const aStarts = normalizeSearchText(a.displayName).startsWith(normalizedQuery);
    const bStarts = normalizeSearchText(b.displayName).startsWith(normalizedQuery);
    if (aStarts === bStarts) return a.displayName.localeCompare(b.displayName, "ru");
    return aStarts ? -1 : 1;
  });
}
