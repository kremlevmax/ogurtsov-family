import type { ReactNode } from "react";

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) p-4">
      <legend className="text-label px-1 text-xs text-(--color-fg-muted)">{title}</legend>
      {children}
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
