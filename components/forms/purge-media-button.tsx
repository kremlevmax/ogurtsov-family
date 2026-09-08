"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { purgeMediaAction } from "@/server/actions/media";

export function PurgeMediaButton({ mediaId, title }: { mediaId: string; title: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePurge() {
    if (!window.confirm(`Удалить файл «${title}» навсегда? Это действие нельзя отменить.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await purgeMediaAction(mediaId);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось удалить навсегда.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={handlePurge}
        className="text-label cursor-pointer text-xs text-(--color-fg-muted) hover:text-(--color-danger) disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Удаляем…" : "Удалить навсегда"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
