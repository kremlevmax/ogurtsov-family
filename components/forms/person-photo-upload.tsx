"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Star, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./form-field";
import {
  presignPersonPhotoAction,
  finalizePersonPhotoAction,
  togglePersonPhotoProfileAction,
  removePersonPhotoAction,
} from "@/server/actions/member-media";
import { readImageDimensions, uploadWithProgress, PHOTO_UPLOAD_ACCEPT } from "@/lib/utils/upload";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { PersonMedia } from "@/features/media/types";

type Status = "idle" | "uploading" | "finalizing" | "error";

export interface PersonPhotoUploadProps {
  personId: string;
  /** Every media item linked to this person — filtered to photos here, same as MediaSection. */
  media: PersonMedia[];
}

/**
 * The member-facing twin of MediaManager/MediaUploadForm — photos only
 * (no documents), scoped to a person the viewer added themselves, shown
 * on their own /people/[id] view (PersonDetailContent) and on
 * /tree/edit/[id] (owner's request: contributors should be able to
 * add a photo of their relative, not just names/dates). Server-side
 * ownership is re-checked on every action anyway (server/actions/member-media.ts),
 * this component just doesn't render for anyone else.
 */
export function PersonPhotoUpload({ personId, media }: PersonPhotoUploadProps) {
  const router = useRouter();
  const photos = media.filter((item) => item.kind === "photo");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [manageError, setManageError] = useState<string | null>(null);

  function resetForm() {
    setFile(null);
    setCaption("");
    setStatus("idle");
    setProgress(0);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setUploadError("Выберите фотографию.");
      return;
    }

    setUploadError(null);
    setStatus("uploading");
    setProgress(0);

    const presignResult = await presignPersonPhotoAction({
      personId,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    if (!presignResult.ok || !presignResult.uploadUrl || !presignResult.pendingUploadId) {
      setStatus("error");
      setUploadError(presignResult.error ?? "Не удалось подготовить загрузку.");
      return;
    }

    try {
      await uploadWithProgress(presignResult.uploadUrl, file, file.type || "application/octet-stream", setProgress);
    } catch (error) {
      setStatus("error");
      setUploadError(error instanceof Error ? error.message : "Загрузка не удалась.");
      return;
    }

    setStatus("finalizing");
    const dimensions = await readImageDimensions(file);

    const finalizeResult = await finalizePersonPhotoAction({
      personId,
      pendingUploadId: presignResult.pendingUploadId,
      originalFilename: file.name,
      caption: caption.trim() || null,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    });

    if (!finalizeResult.ok) {
      setStatus("error");
      setUploadError(finalizeResult.error ?? "Не удалось сохранить фото.");
      return;
    }

    resetForm();
    router.refresh();
  }

  function handleToggleProfile(mediaId: string, isProfile: boolean) {
    setManageError(null);
    startTransition(async () => {
      const result = await togglePersonPhotoProfileAction(personId, mediaId, !isProfile);
      if (result.ok) router.refresh();
      else setManageError(result.error ?? "Не удалось изменить фото профиля.");
    });
  }

  function handleRemove(mediaId: string) {
    if (!window.confirm("Удалить эту фотографию?")) return;
    setManageError(null);
    startTransition(async () => {
      const result = await removePersonPhotoAction(personId, mediaId);
      if (result.ok) router.refresh();
      else setManageError(result.error ?? "Не удалось удалить фото.");
    });
  }

  const isBusy = status === "uploading" || status === "finalizing";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-inset) p-4">
      <p className="text-label text-xs text-(--color-fg-muted)">Фотографии этого человека</p>

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => {
            const url = getMediaPublicUrl(photo.objectKey);
            return (
              <li key={photo.id} className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated)">
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleProfile(photo.id, photo.isProfile)}
                    title={photo.isProfile ? "Убрать из фото профиля" : "Сделать фото профиля"}
                    className={photo.isProfile ? "text-(--color-gold-light)" : "text-white hover:text-(--color-gold-light)"}
                  >
                    <Star className="h-4 w-4" fill={photo.isProfile ? "currentColor" : "none"} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleRemove(photo.id)}
                    title="Удалить фотографию"
                    className="text-white hover:text-(--color-danger)"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {photo.isProfile && (
                  <span className="absolute top-1 left-1 rounded-full bg-black/50 p-1 text-(--color-gold-light)">
                    <Star className="h-3 w-3" fill="currentColor" aria-hidden="true" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {manageError && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {manageError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-(--color-border) bg-(--color-bg-elevated) px-4 py-6 text-center text-sm text-(--color-fg-muted) hover:border-(--color-accent)">
          <UploadCloud className="h-5 w-5" aria-hidden="true" />
          {file ? file.name : "Выберите фотографию (до 100 МБ)"}
          <input
            ref={fileInputRef}
            type="file"
            accept={PHOTO_UPLOAD_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setUploadError(null);
            }}
            disabled={isBusy}
          />
        </label>

        {file && (
          <Field label="Подпись (необязательно)">
            <Input value={caption} onChange={(event) => setCaption(event.target.value)} disabled={isBusy} />
          </Field>
        )}

        {status === "uploading" && (
          <div className="flex flex-col gap-1">
            <div className="h-2 overflow-hidden rounded-full bg-(--color-border)">
              <div
                className="h-full rounded-full bg-(--color-accent) transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-(--color-fg-muted)">Загружаем… {progress}%</p>
          </div>
        )}
        {status === "finalizing" && <p className="text-xs text-(--color-fg-muted)">Проверяем фото…</p>}

        {uploadError && (
          <p role="alert" className="text-sm text-(--color-danger)">
            {uploadError}
          </p>
        )}

        <div>
          <Button type="submit" variant="secondary" disabled={!file || isBusy}>
            {isBusy ? "Загружаем…" : "Загрузить фото"}
          </Button>
        </div>
      </form>
    </div>
  );
}
