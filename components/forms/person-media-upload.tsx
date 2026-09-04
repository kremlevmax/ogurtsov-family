"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Star, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./form-field";
import {
  presignPersonMediaAction,
  finalizePersonMediaAction,
  togglePersonPhotoProfileAction,
  removePersonMediaAction,
} from "@/server/actions/member-media";
import {
  readImageDimensions,
  uploadWithProgress,
  PHOTO_UPLOAD_ACCEPT,
  DOCUMENT_UPLOAD_ACCEPT,
} from "@/lib/utils/upload";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { formatFileSize } from "@/lib/media/format";
import type { PersonMedia } from "@/features/media/types";

type Status = "idle" | "uploading" | "finalizing" | "error";

export interface PersonMediaUploadProps {
  personId: string;
  /** Every media item linked to this person — split into photos/documents here. */
  media: PersonMedia[];
}

/**
 * The member-facing twin of MediaManager/MediaUploadForm — photos and
 * documents only (no audio/video/archives), scoped to a person the
 * viewer added themselves, shown on their own /people/[id] view
 * (PersonDetailContent) and on /tree/edit/[id] (owner's request:
 * contributors should be able to add a photo or document of their
 * relative, not just names/dates — and see both, not just photos,
 * which is all this offered at first). Server-side ownership is
 * re-checked on every action anyway (server/actions/member-media.ts),
 * this component just doesn't render for anyone else.
 */
export function PersonMediaUpload({ personId, media }: PersonMediaUploadProps) {
  const photos = media.filter((item) => item.kind === "photo");
  const documents = media.filter((item) => item.kind !== "photo");

  return (
    <div className="flex flex-col gap-4">
      <PhotoBlock personId={personId} photos={photos} />
      <DocumentBlock personId={personId} documents={documents} />
    </div>
  );
}

/** Shared presign → upload → finalize sequence — the only difference between the photo and document blocks is the accept list and the finalize call's dimensions. */
async function runUpload(
  personId: string,
  file: File,
  caption: string,
  onProgress: (percent: number) => void,
  onFinalizing: () => void,
): Promise<{ ok: boolean; error?: string }> {
  const presignResult = await presignPersonMediaAction({
    personId,
    originalFilename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  if (!presignResult.ok || !presignResult.uploadUrl || !presignResult.pendingUploadId) {
    return { ok: false, error: presignResult.error ?? "Не удалось подготовить загрузку." };
  }

  try {
    await uploadWithProgress(presignResult.uploadUrl, file, file.type || "application/octet-stream", onProgress);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Загрузка не удалась." };
  }

  onFinalizing();
  const dimensions = await readImageDimensions(file);
  const finalizeResult = await finalizePersonMediaAction({
    personId,
    pendingUploadId: presignResult.pendingUploadId,
    originalFilename: file.name,
    caption: caption.trim() || null,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  });
  if (!finalizeResult.ok) {
    return { ok: false, error: finalizeResult.error ?? "Не удалось сохранить файл." };
  }

  return { ok: true };
}

function PhotoBlock({ personId, photos }: { personId: string; photos: PersonMedia[] }) {
  const router = useRouter();
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

    const result = await runUpload(personId, file, caption, setProgress, () => setStatus("finalizing"));
    setStatus(result.ok ? "idle" : "error");
    if (!result.ok) {
      setUploadError(result.error ?? null);
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
      const result = await removePersonMediaAction(personId, mediaId);
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
              <li
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated)"
              >
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
        {status === "finalizing" && <p className="text-xs text-(--color-fg-muted)">Проверяем файл…</p>}

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

function DocumentBlock({ personId, documents }: { personId: string; documents: PersonMedia[] }) {
  const router = useRouter();
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
      setUploadError("Выберите документ.");
      return;
    }
    setUploadError(null);
    setStatus("uploading");
    setProgress(0);

    const result = await runUpload(personId, file, caption, setProgress, () => setStatus("finalizing"));
    setStatus(result.ok ? "idle" : "error");
    if (!result.ok) {
      setUploadError(result.error ?? null);
      return;
    }
    resetForm();
    router.refresh();
  }

  function handleRemove(mediaId: string) {
    if (!window.confirm("Удалить этот документ?")) return;
    setManageError(null);
    startTransition(async () => {
      const result = await removePersonMediaAction(personId, mediaId);
      if (result.ok) router.refresh();
      else setManageError(result.error ?? "Не удалось удалить документ.");
    });
  }

  const isBusy = status === "uploading" || status === "finalizing";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-inset) p-4">
      <p className="text-label text-xs text-(--color-fg-muted)">Документы этого человека</p>

      {documents.length > 0 && (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => {
            const url = getMediaPublicUrl(doc.objectKey);
            return (
              <li
                key={doc.id}
                className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2"
              >
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] border border-(--color-border) text-(--color-fg-muted)">
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[9px] font-medium uppercase">{doc.extension}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-(--color-fg)">{doc.title}</p>
                  <p className="text-xs text-(--color-fg-muted)">{formatFileSize(doc.sizeBytes)}</p>
                </div>
                {url && (
                  <a
                    href={url}
                    download={doc.originalFilename}
                    className="text-label shrink-0 text-[10px] text-(--color-accent) hover:underline"
                  >
                    Скачать
                  </a>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleRemove(doc.id)}
                  title="Удалить документ"
                  className="shrink-0 rounded-full p-1.5 text-(--color-fg-muted) hover:text-(--color-danger)"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
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
          {file ? file.name : "Выберите документ (до 100 МБ)"}
          <input
            ref={fileInputRef}
            type="file"
            accept={DOCUMENT_UPLOAD_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setUploadError(null);
            }}
            disabled={isBusy}
          />
        </label>

        {file && (
          <Field label="Пояснение (необязательно)">
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
        {status === "finalizing" && <p className="text-xs text-(--color-fg-muted)">Проверяем файл…</p>}

        {uploadError && (
          <p role="alert" className="text-sm text-(--color-danger)">
            {uploadError}
          </p>
        )}

        <div>
          <Button type="submit" variant="secondary" disabled={!file || isBusy}>
            {isBusy ? "Загружаем…" : "Загрузить документ"}
          </Button>
        </div>
      </form>
    </div>
  );
}
