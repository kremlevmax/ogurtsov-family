"use client";

import type { DatePrecision, DateValue } from "@/lib/dates/date-value";
import { cn } from "@/lib/utils/cn";

const PRECISION_OPTIONS: { value: DatePrecision; label: string }[] = [
  { value: "unknown", label: "Неизвестна" },
  { value: "exact", label: "Точная дата" },
  { value: "year", label: "Только год" },
  { value: "approximate", label: "Приблизительно" },
  { value: "range", label: "Диапазон лет" },
];

const fieldClassName =
  "h-10 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 text-sm text-(--color-fg) focus-visible:outline-none";

function yearOf(iso: string | null): string {
  return iso ? iso.slice(0, 4) : "";
}

function isoFromYear(rawYear: string): string | null {
  if (!/^\d{4}$/.test(rawYear)) return null;
  return `${rawYear}-01-01`;
}

export interface DateValueFieldProps {
  label: string;
  value: DateValue;
  onChange: (value: DateValue) => void;
}

/** Editor control for one of the person's imprecise dates (CLAUDE.md 12). */
export function DateValueField({ label, value, onChange }: DateValueFieldProps) {
  function setPrecision(precision: DatePrecision) {
    if (precision === "unknown") {
      onChange({ precision, start: null, end: null, text: value.text });
      return;
    }
    if (precision === "range") {
      onChange({ precision, start: value.start, end: value.end, text: value.text });
      return;
    }
    // exact / year / approximate all keep start === end.
    onChange({ precision, start: value.start, end: value.start, text: value.text });
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-(--color-fg)">{label}</legend>

      <select
        value={value.precision}
        onChange={(event) => setPrecision(event.target.value as DatePrecision)}
        className={cn(fieldClassName, "w-fit")}
        aria-label={`${label}: точность`}
      >
        {PRECISION_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {value.precision === "exact" && (
        <input
          type="date"
          value={value.start ?? ""}
          onChange={(event) => {
            const start = event.target.value || null;
            onChange({ ...value, start, end: start });
          }}
          className={fieldClassName}
          aria-label={`${label}: дата`}
        />
      )}

      {(value.precision === "year" || value.precision === "approximate") && (
        <input
          type="number"
          inputMode="numeric"
          placeholder="Год"
          value={yearOf(value.start)}
          onChange={(event) => {
            const iso = isoFromYear(event.target.value);
            onChange({ ...value, start: iso, end: iso });
          }}
          className={cn(fieldClassName, "w-28")}
          aria-label={`${label}: год`}
        />
      )}

      {value.precision === "range" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="С"
            value={yearOf(value.start)}
            onChange={(event) => onChange({ ...value, start: isoFromYear(event.target.value) })}
            className={cn(fieldClassName, "w-24")}
            aria-label={`${label}: с года`}
          />
          <span aria-hidden="true" className="text-(--color-fg-muted)">
            —
          </span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="По"
            value={yearOf(value.end)}
            onChange={(event) => onChange({ ...value, end: isoFromYear(event.target.value) })}
            className={cn(fieldClassName, "w-24")}
            aria-label={`${label}: по год`}
          />
        </div>
      )}

      <input
        type="text"
        placeholder="Пояснение (необязательно), например «со слов бабушки»"
        value={value.text ?? ""}
        onChange={(event) => onChange({ ...value, text: event.target.value || null })}
        className={fieldClassName}
        aria-label={`${label}: пояснение`}
      />
    </fieldset>
  );
}
