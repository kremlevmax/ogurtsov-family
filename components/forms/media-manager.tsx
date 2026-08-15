"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2 } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { PersonMedia } from "@/features/media/types";
import { deleteMediaAction, setProfilePhotoAction, unsetProfilePhotoAction } from "@/server/actions/media";
import { MediaUploadForm } from "./media-upload";

export interface MediaManagerProps {
  personId: string;
  media: PersonMedia[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function MediaManager({ personId, media }: MediaManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(mediaId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteMediaAction(mediaId, personId);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Не удалось удалить файл.");
    });
  }

  function handleToggleProfile(mediaId: string, isProfile: boolean) {
    setError(null);
    startTransition(async () => {
      const result = isProfile
        ? await unsetProfilePhotoAction(personId, mediaId)
        : await setProfilePhotoAction(personId, mediaId);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Не удалось изменить фото профиля.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {media.length > 0 && (
        <ul className="flex flex-col gap-2">
          {media.map((item) => {
            const url = getMediaPublicUrl(item.objectKey);
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2"
              >
                {item.kind === "photo" && url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] border border-(--color-border) object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-(--color-border) text-[10px] font-medium uppercase text-(--color-fg-muted)">
                    {item.extension}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--color-fg)">{item.title}</p>
                  <p className="text-xs text-(--color-fg-muted)">{formatFileSize(item.sizeBytes)}</p>
                </div>

                {item.kind === "photo" && (
                  <button
                    type="button"
                    onClick={() => handleToggleProfile(item.id, item.isProfile)}
                    disabled={isPending}
                    title={item.isProfile ? "Убрать из фото профиля" : "Сделать фото профиля"}
                    className={
                      item.isProfile
                        ? "shrink-0 rounded-full p-1.5 text-(--color-accent)"
                        : "shrink-0 rounded-full p-1.5 text-(--color-fg-muted) hover:text-(--color-accent)"
                    }
                  >
                    <Star className="h-4 w-4" fill={item.isProfile ? "currentColor" : "none"} aria-hidden="true" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  disabled={isPending}
                  title="Удалить"
                  className="shrink-0 rounded-full p-1.5 text-(--color-fg-muted) hover:text-(--color-danger)"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}

      <MediaUploadForm personId={personId} />
    </div>
  );
}
