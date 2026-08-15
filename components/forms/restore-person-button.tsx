"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restorePersonAction } from "@/server/actions/people";
import { Button } from "@/components/ui/button";

export function RestorePersonButton({ personId }: { personId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await restorePersonAction(personId);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось восстановить человека.");
            }
          });
        }}
      >
        {isPending ? "Восстанавливаем…" : "Восстановить"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
