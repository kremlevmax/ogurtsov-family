/** Raw name parts as stored on a `people` row. */
export interface PersonNameParts {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  maidenName: string | null;
}

/**
 * Builds the canonical display name: "Фамилия Имя Отчество (Девичья)".
 * Falls back gracefully when parts are missing so placeholder people
 * (e.g. "Неизвестный отец") still render sensibly.
 */
export function buildDisplayName(parts: PersonNameParts): string {
  const segments = [parts.lastName, parts.firstName, parts.middleName].filter(
    (segment): segment is string => Boolean(segment && segment.trim()),
  );

  const base = segments.join(" ").trim();

  if (parts.maidenName && parts.maidenName.trim()) {
    return base ? `${base} (${parts.maidenName.trim()})` : `(${parts.maidenName.trim()})`;
  }

  return base;
}

/** Builds "Имя Отчество"-style short form for compact UI (tree nodes). */
export function buildShortName(parts: PersonNameParts): string {
  const segments = [parts.firstName, parts.middleName].filter(
    (segment): segment is string => Boolean(segment && segment.trim()),
  );
  return segments.join(" ").trim();
}
