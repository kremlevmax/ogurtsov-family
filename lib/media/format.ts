export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/**
 * Adds "г." after a bare 4-digit year ("1786" → "1786 г.") so it doesn't
 * read like a stray number — a more descriptive value someone typed
 * ("около 1980", "конец 1950-х") is shown exactly as entered. Display
 * only: `media.date_text` itself is stored without the suffix, so
 * editing still shows and re-saves the plain value.
 */
export function formatMediaDate(dateText: string | null): string | null {
  if (!dateText) return null;
  return /^\d{4}$/.test(dateText) ? `${dateText} г.` : dateText;
}
