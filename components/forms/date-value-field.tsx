"use client";

import { useState } from "react";
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

/**
 * A plain controlled `<input value={yearOf(iso)}>` fights the user: as
 * long as fewer than 4 digits are typed, `isoFromYear` returns `null`,
 * `yearOf(null)` is `""`, and the field appears to reject every
 * keystroke. Keeping the typed text in local state (only converting to
 * an ISO date once it's a full 4-digit year) lets the field echo
 * whatever's typed while the parent `DateValue` stays well-formed.
 */
function YearInput({
  isoValue,
  onIsoChange,
  placeholder,
  ariaLabel,
  className,
}: {
  isoValue: string | null;
  onIsoChange: (iso: string | null) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}) {
  const [text, setText] = useState(() => yearOf(isoValue));

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
        setText(digits);
        onIsoChange(isoFromYear(digits));
      }}
      className={className}
      aria-label={ariaLabel}
    />
  );
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
        <YearInput
          isoValue={value.start}
          onIsoChange={(iso) => onChange({ ...value, start: iso, end: iso })}
          placeholder="Год"
          className={cn(fieldClassName, "w-28")}
          ariaLabel={`${label}: год`}
        />
      )}

      {value.precision === "range" && (
        <div className="flex items-center gap-2">
          <YearInput
            isoValue={value.start}
            onIsoChange={(iso) => onChange({ ...value, start: iso })}
            placeholder="С"
            className={cn(fieldClassName, "w-24")}
            ariaLabel={`${label}: с года`}
          />
          <span aria-hidden="true" className="text-(--color-fg-muted)">
            —
          </span>
          <YearInput
            isoValue={value.end}
            onIsoChange={(iso) => onChange({ ...value, end: iso })}
            placeholder="По"
            className={cn(fieldClassName, "w-24")}
            ariaLabel={`${label}: по год`}
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
