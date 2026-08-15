/**
 * Domain model for imprecise genealogical dates: unknown, year-only,
 * month/year, approximate, exact, or a range. `start`/`end` always hold
 * ISO calendar bounds so sorting and range queries stay simple, while
 * `precision` controls how those bounds are rendered to the user.
 */

export type DatePrecision =
  | "unknown"
  | "exact"
  | "year"
  | "month"
  | "approximate"
  | "range";

export interface DateValue {
  precision: DatePrecision;
  /** ISO date (YYYY-MM-DD), inclusive lower bound. Null when unknown. */
  start: string | null;
  /** ISO date (YYYY-MM-DD), inclusive upper bound. Null when unknown. */
  end: string | null;
  /** Free-text note shown alongside the formatted date, e.g. "со слов бабушки". */
  text: string | null;
}

const MONTH_NAMES_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

const MONTH_NAMES_NOMINATIVE = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatDayMonthYear(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  return `${day} ${MONTH_NAMES_GENITIVE[month - 1]} ${year}`;
}

function formatMonthYear(iso: string): string {
  const { year, month } = parseIsoDate(iso);
  return `${MONTH_NAMES_NOMINATIVE[month - 1]} ${year}`;
}

function formatYear(iso: string): string {
  return String(parseIsoDate(iso).year);
}

/**
 * Formats a DateValue into a single-line Russian string. Never invents
 * precision that was not actually recorded (e.g. a year-only date is
 * never shown with a day and month).
 */
export function formatDateValue(value: DateValue): string {
  const suffix = value.text ? ` (${value.text})` : "";

  switch (value.precision) {
    case "unknown":
      return "дата неизвестна" + suffix;
    case "exact":
      if (!value.start) return "дата неизвестна" + suffix;
      return formatDayMonthYear(value.start) + suffix;
    case "month":
      if (!value.start) return "дата неизвестна" + suffix;
      return formatMonthYear(value.start) + suffix;
    case "year":
      if (!value.start) return "дата неизвестна" + suffix;
      return formatYear(value.start) + suffix;
    case "approximate": {
      if (!value.start) return "дата неизвестна" + suffix;
      return `около ${formatYear(value.start)}` + suffix;
    }
    case "range": {
      if (!value.start && !value.end) return "дата неизвестна" + suffix;
      if (value.start && value.end) {
        return `${formatYear(value.start)}–${formatYear(value.end)}` + suffix;
      }
      if (value.start) return `после ${formatYear(value.start)}` + suffix;
      return `до ${formatYear(value.end as string)}` + suffix;
    }
    default:
      return "дата неизвестна" + suffix;
  }
}

/**
 * Extracts a display year (e.g. for "1920–1998" life-span labels in tree
 * nodes). Returns null when no year can be determined without guessing.
 */
export function extractDisplayYear(value: DateValue): number | null {
  if (value.precision === "unknown") return null;
  const iso = value.start ?? value.end;
  if (!iso) return null;
  return parseIsoDate(iso).year;
}

/** Formats a person's life span as "1920–1998", "1920 — н.в." or "?". */
export function formatLifeSpan(
  birth: DateValue | null,
  death: DateValue | null,
  isDeceased: boolean,
): string | null {
  const birthYear = birth ? extractDisplayYear(birth) : null;
  const deathYear = death ? extractDisplayYear(death) : null;

  if (birthYear === null && deathYear === null) return null;
  const birthLabel = birthYear === null ? "?" : String(birthYear);

  if (deathYear !== null) {
    return `${birthLabel}–${deathYear}`;
  }

  if (isDeceased) {
    return `${birthLabel}–?`;
  }

  return birthYear === null ? null : `${birthLabel} — н.в.`;
}
