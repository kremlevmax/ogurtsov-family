/** Raw name parts as stored on a `people` row. */
export interface PersonNameParts {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  maidenName: string | null;
}

/** Joins ordered name segments, dropping missing ones, and appends "(Девичья)" when set. Shared by `buildDisplayName` and `buildDisplayNameFirstNameFirst` so the two never drift apart on how the maiden-name suffix is formatted. */
function joinNameSegments(segments: (string | null)[], maidenName: string | null): string {
  const base = segments
    .filter((segment): segment is string => Boolean(segment && segment.trim()))
    .join(" ")
    .trim();

  if (maidenName && maidenName.trim()) {
    return base ? `${base} (${maidenName.trim()})` : `(${maidenName.trim()})`;
  }

  return base;
}

/**
 * Builds the canonical display name: "Фамилия Имя Отчество (Девичья)".
 * Falls back gracefully when parts are missing so placeholder people
 * (e.g. "Неизвестный отец") still render sensibly.
 */
export function buildDisplayName(parts: PersonNameParts): string {
  return joinNameSegments([parts.lastName, parts.firstName, parts.middleName], parts.maidenName);
}

/** Same as `buildDisplayName`, but leads with имя: "Имя Отчество Фамилия (Девичья)" — for a list sorted by first name, where reading order should match sort order. */
export function buildDisplayNameFirstNameFirst(parts: PersonNameParts): string {
  return joinNameSegments([parts.firstName, parts.middleName, parts.lastName], parts.maidenName);
}

/** Builds "Имя Отчество"-style short form for compact UI (tree nodes). */
export function buildShortName(parts: PersonNameParts): string {
  const segments = [parts.firstName, parts.middleName].filter(
    (segment): segment is string => Boolean(segment && segment.trim()),
  );
  return segments.join(" ").trim();
}

type SortableNameParts = Pick<PersonNameParts, "lastName" | "maidenName" | "firstName" | "middleName">;

/** Compares two same-length key tuples lexicographically, field by field, using Russian collation (so `ё`/`е` and case sort the way a reader would expect, not raw UTF-16 code-unit order). */
function compareKeys(keyA: readonly string[], keyB: readonly string[]): number {
  for (let i = 0; i < keyA.length; i++) {
    const diff = keyA[i].localeCompare(keyB[i], "ru");
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Primary key: фамилия, а если её нет — девичья фамилия, а если и её
 * нет — имя. Followed by имя and отчество as tie-breakers — on a
 * one-family site nearly everyone shares the same фамилия, and without
 * these the whole "Огурцовы" group would sort in arbitrary (DB fetch)
 * order instead of alphabetically among themselves.
 */
function sortNameKey(parts: SortableNameParts): [string, string, string] {
  const primary = parts.lastName || parts.maidenName || parts.firstName;
  return [primary ? primary.trim() : "", (parts.firstName ?? "").trim(), (parts.middleName ?? "").trim()];
}

/**
 * Sorts people alphabetically: by last name, falling back to maiden
 * name, falling back to first name (CLAUDE.md 8's search fields, same
 * fallback order, applied to display sorting instead of matching), then
 * by first name and middle name to break ties within a shared surname.
 */
export function compareByName<T extends SortableNameParts>(a: T, b: T): number {
  return compareKeys(sortNameKey(a), sortNameKey(b));
}

/** Mirrors `sortNameKey`, but leads with имя instead of фамилия. */
function sortFirstNameKey(parts: SortableNameParts): [string, string, string] {
  const primary = parts.firstName || parts.lastName || parts.maidenName;
  const surname = parts.lastName || parts.maidenName;
  return [primary ? primary.trim() : "", (parts.middleName ?? "").trim(), surname ? surname.trim() : ""];
}

/** Sorts people alphabetically by first name, then by middle name and surname to break ties between namesakes. */
export function compareByFirstName<T extends SortableNameParts>(a: T, b: T): number {
  return compareKeys(sortFirstNameKey(a), sortFirstNameKey(b));
}
