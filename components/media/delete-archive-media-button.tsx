"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteArchiveMediaAction } from "@/server/actions/media";

export interface DeleteArchiveMediaButtonProps {
  mediaId: string;
  linkedPersonIds: string[];
  title: string;
}

/** Shown only to editors on the public /archive list (SiteArchive) — soft-deletes the file, same guard as the editor's own media manager. */
export function DeleteArchiveMediaButton({ mediaId, linkedPersonIds, title }: DeleteArchiveMediaButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        title="Удалить файл"
        aria-label={`Удалить файл «${title}»`}
        onClick={() => {
          if (!window.confirm(`Удалить файл «${title}»?`)) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteArchiveMediaAction(mediaId, linkedPersonIds);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось удалить файл.");
            }
          });
        }}
        className="text-label inline-flex items-center gap-1 text-[10px] text-(--color-fg-muted) hover:text-(--color-danger) disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        {isPending ? "Удаляем…" : "Удалить"}
      </button>
      {error && (
        <p role="alert" className="text-[10px] text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
