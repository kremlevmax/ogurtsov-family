/**
 * Pulls a plausible 4-digit year out of a free-text approximate date
 * ("около 1980", "1873г.", "конец 1950-х") — `media.date_text` is plain
 * text (CLAUDE.md 3.7), not a structured date, so sorting by year needs
 * this instead of a real column. Returns null when nothing plausible is
 * found; sort UIs push those items to the end rather than guessing.
 */
export function extractYear(dateText: string | null): number | null {
  if (!dateText) return null;
  const match = dateText.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

/**
 * Same extraction, but falls back to the title when `date_text` isn't
 * set — most existing documents/photos predate this field and already
 * carry their year in the title ("Ревизская сказка деревни Рубежня
 * 1850 года"), so sorting by year is useful immediately instead of
 * only once every item is re-edited to fill in the new field.
 */
export function extractYearForSort(item: { dateText: string | null; title: string }): number | null {
  return extractYear(item.dateText) ?? extractYear(item.title);
}
