import type { ReactNode } from "react";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    // The flex layout lives on the inner div, not the <fieldset> itself —
    // a <fieldset> with display:flex has a genuinely different legend/
    // border-notch algorithm in Safari than a plain block fieldset (the
    // notch there was cut around a stretched flex-item box far past the
    // "ИМЯ"/"ДАТЫ" text, not around the text itself). Keeping the
    // fieldset a plain block element gives every browser the exact same,
    // fully standard legend-in-a-border-notch rendering.
    <fieldset className="rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-4">
      <legend className="text-label px-1 text-xs text-(--color-fg-muted)">{title}</legend>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-(--color-fg)">{label}</span>
      {children}
      {error && (
        <span role="alert" className="text-xs text-(--color-danger)">
          {error}
        </span>
      )}
    </label>
  );
}
