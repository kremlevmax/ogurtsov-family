"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { softDeletePersonAction } from "@/server/actions/people";
import { Button } from "@/components/ui/button";

export interface DeletePersonButtonProps {
  personId: string;
  /** Active relationships this person is part of — shown as a warning before deletion. */
  dependentCount: number;
}

/** Two-step delete: click once to reveal the warning, click again to confirm (CLAUDE.md 10, 12). */
export function DeletePersonButton({ personId, dependentCount }: DeletePersonButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
        Удалить человека
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-danger) bg-(--color-bg-elevated) p-4">
      <p className="text-sm text-(--color-fg)">
        {dependentCount > 0
          ? `У этого человека ${dependentCount} ${dependentCount === 1 ? "связь" : "связи"} с другими людьми — при удалении они тоже станут неактивными. `
          : ""}
        Удалённого человека можно восстановить позже из панели редактора. Точно удалить?
      </p>

      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          className="bg-(--color-danger) hover:opacity-90"
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await softDeletePersonAction(personId);
              if (result.ok) {
                router.push("/edit");
              } else {
                setError(result.error ?? "Не удалось удалить человека.");
              }
            });
          }}
        >
          {isPending ? "Удаляем…" : "Да, удалить"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={isPending}>
          Отмена
        </Button>
      </div>
    </div>
  );
}
