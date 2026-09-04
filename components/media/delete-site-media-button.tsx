"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSiteMediaAction } from "@/server/actions/media";

export interface DeleteSiteMediaButtonProps {
  mediaId: string;
  linkedPersonIds: string[];
  title: string;
  /**
   * "row" (default) — a labelled button for a list row, like /archive's
   * document list. "icon" — a small round icon-only button meant to sit
   * over a photo thumbnail, like /gallery's grid (no room for a label,
   * and the confirm dialog still names the file for both).
   */
  variant?: "row" | "icon";
}

/** Shown only to editors on the public /archive and /gallery lists — soft-deletes the file, same guard as the editor's own media manager. */
export function DeleteSiteMediaButton({ mediaId, linkedPersonIds, title, variant = "row" }: DeleteSiteMediaButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Удалить файл «${title}»?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteSiteMediaAction(mediaId, linkedPersonIds);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось удалить файл.");
      }
    });
  }

  if (variant === "icon") {
    return (
      <div className="absolute top-1.5 right-1.5">
        <button
          type="button"
          disabled={isPending}
          title="Удалить файл"
          aria-label={`Удалить файл «${title}»`}
          onClick={handleDelete}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-(--color-danger) focus-visible:opacity-100 disabled:opacity-100 disabled:hover:bg-black/55 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {error && (
          <p role="alert" className="absolute top-7 right-0 w-32 text-right text-[10px] text-(--color-danger)">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        title="Удалить файл"
        aria-label={`Удалить файл «${title}»`}
        onClick={handleDelete}
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
