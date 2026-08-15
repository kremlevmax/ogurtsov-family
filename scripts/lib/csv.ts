/** Minimal RFC 4180 CSV writer — avoids pulling in a dependency for a handful of flat export tables. */
export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCsvField).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvField(row[column])).join(","));
  return [header, ...lines].join("\r\n") + "\r\n";
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
