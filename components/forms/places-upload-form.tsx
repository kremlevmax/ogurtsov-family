"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { presignPlacePhotoAction, finalizePlacePhotoAction } from "@/server/actions/place-media";
import { readImageDimensions, uploadWithProgress, PHOTO_UPLOAD_ACCEPT } from "@/lib/utils/upload";

type Status = "idle" | "uploading" | "error";

export interface PlacesUploadFormProps {
  id: string;
  onDone: () => void;
}

/**
 * "Добавить фотографии мест" — exactly the four fields the handoff
 * spec allows: files, caption, approximate year, save. No relatives/
 * branch/category field (owner's explicit constraint). Multiple files
 * upload sequentially, sharing the one caption/year — the spec's
 * "files" field is plural but the form has only one caption/year pair,
 * so a batch of photos of the same place on the same trip is the
 * intended use, not per-file metadata.
 */
export function PlacesUploadForm({ id, onDone }: PlacesUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [approxYear, setApproxYear] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Выберите хотя бы одну фотографию.");
      return;
    }
    if (!caption.trim()) {
      setError("Укажите подпись.");
      return;
    }

    setError(null);
    setStatus("uploading");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(Math.round((i / files.length) * 100));

      const presignResult = await presignPlacePhotoAction({
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      if (!presignResult.ok || !presignResult.uploadUrl || !presignResult.pendingUploadId) {
        setStatus("error");
        setError(presignResult.error ?? "Не удалось подготовить загрузку.");
        return;
      }

      try {
        await uploadWithProgress(presignResult.uploadUrl, file, file.type || "application/octet-stream", () => {});
      } catch (uploadError) {
        setStatus("error");
        setError(uploadError instanceof Error ? uploadError.message : "Загрузка не удалась.");
        return;
      }

      const dimensions = await readImageDimensions(file);
      const finalizeResult = await finalizePlacePhotoAction({
        pendingUploadId: presignResult.pendingUploadId,
        originalFilename: file.name,
        caption: caption || null,
        approxYear: approxYear || null,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      });
      if (!finalizeResult.ok) {
        setStatus("error");
        setError(finalizeResult.error ?? "Не удалось сохранить фотографию.");
        return;
      }
    }

    setProgress(100);
    setFiles([]);
    setCaption("");
    setApproxYear("");
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
    onDone();
  }

  const isBusy = status === "uploading";

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 border-t border-(--h-gold-200) px-[38px] py-8 sm:flex-row sm:items-end sm:gap-6"
    >
      <div className="flex flex-col gap-1.5 sm:w-[260px]">
        <span className="text-lg text-(--h-ink)">Фотографии</span>
        <label
          className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-[var(--h-radius-control)] border border-dashed border-(--h-gold-200) px-3 text-center text-lg text-(--h-muted) hover:border-(--h-gold-500)"
        >
          <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
          {files.length > 0 ? `Выбрано: ${files.length}` : "Выбрать фотографии"}
          <input
            ref={fileInputRef}
            type="file"
            accept={PHOTO_UPLOAD_ACCEPT}
            multiple
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => {
              setFiles(Array.from(event.target.files ?? []));
              setError(null);
            }}
          />
        </label>
      </div>

      <label className="flex flex-1 flex-col gap-1.5 sm:max-w-[500px]">
        <span className="text-lg text-(--h-ink)">Подпись</span>
        <input
          type="text"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          disabled={isBusy}
          required
          maxLength={200}
          className="h-[50px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 text-lg text-(--h-ink) focus-visible:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5 sm:w-[220px]">
        <span className="text-lg text-(--h-ink)">Примерный год</span>
        <input
          type="text"
          value={approxYear}
          onChange={(event) => setApproxYear(event.target.value)}
          disabled={isBusy}
          placeholder="например, около 1980"
          maxLength={40}
          className="h-[50px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 text-lg text-(--h-ink) focus-visible:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={isBusy}
        className="flex h-[50px] cursor-pointer items-center justify-center rounded-[var(--h-radius-control)] bg-(--h-forest-800) px-6 text-lg font-medium text-(--h-white-warm) disabled:cursor-not-allowed disabled:opacity-60 sm:w-[282px]"
      >
        {isBusy ? `Сохраняем… ${progress}%` : "Сохранить"}
      </button>

      {error && (
        <p role="alert" className="w-full text-lg text-(--color-danger)">
          {error}
        </p>
      )}
    </form>
  );
}
