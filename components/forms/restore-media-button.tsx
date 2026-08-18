"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreMediaAction } from "@/server/actions/media";
import { Button } from "@/components/ui/button";

export function RestoreMediaButton({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await restoreMediaAction(mediaId);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось восстановить файл.");
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
