"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { presignArchiveDocumentAction, finalizeArchiveDocumentAction } from "@/server/actions/archive-media";
import { readImageDimensions, uploadWithProgress, generatePdfThumbnail, DOCUMENT_UPLOAD_ACCEPT } from "@/lib/utils/upload";
import { DOCUMENT_CATEGORIES } from "@/lib/validation/document-category";

type Status = "idle" | "uploading" | "finalizing" | "error";

export interface ArchiveDocumentUploadFormProps {
  id: string;
  onDone: () => void;
}

/**
 * "Добавить документ" directly on /archive — creates a standalone
 * document with no person link (server/actions/archive-media.ts), same
 * shape as PlacesUploadForm for photos. Editor-only (the button that
 * opens this is gated on isEditor in document-gallery.tsx).
 */
export function ArchiveDocumentUploadForm({ id, onDone }: ArchiveDocumentUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceOrOwner, setSourceOrOwner] = useState("");
  const [category, setCategory] = useState("");
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setCaption("");
    setSourceOrOwner("");
    setCategory("");
    setTranscript("");
    setStatus("idle");
    setProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(selected: File | null) {
    setFile(selected);
    setError(null);
    if (selected && !title) {
      setTitle(selected.name.replace(/\.[^.]+$/, ""));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Выберите файл.");
      return;
    }
    if (!caption.trim()) {
      setError("Укажите подпись или пояснение.");
      return;
    }

    setError(null);
    setStatus("uploading");
    setProgress(0);

    const presignResult = await presignArchiveDocumentAction({
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
      await uploadWithProgress(presignResult.uploadUrl, file, file.type || "application/octet-stream", setProgress);
    } catch (uploadError) {
      setStatus("error");
      setError(uploadError instanceof Error ? uploadError.message : "Загрузка не удалась.");
      return;
    }

    setStatus("finalizing");
    const [dimensions, thumbnail] = await Promise.all([readImageDimensions(file), generatePdfThumbnail(file)]);

    const finalizeResult = await finalizeArchiveDocumentAction({
      pendingUploadId: presignResult.pendingUploadId,
      originalFilename: file.name,
      title: title.trim() || file.name,
      caption: caption.trim(),
      sourceOrOwner: sourceOrOwner.trim() || null,
      category: category || null,
      transcript: transcript.trim() || null,
      thumbnail,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
    });

    if (!finalizeResult.ok) {
      setStatus("error");
      setError(finalizeResult.error ?? "Не удалось сохранить файл.");
      return;
    }

    reset();
    router.refresh();
    onDone();
  }

  const isBusy = status === "uploading" || status === "finalizing";

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 border-t border-(--h-gold-200) px-[38px] py-8"
    >
      <div className="flex flex-col gap-1.5 sm:max-w-[320px]">
        <span className="text-lg text-(--h-ink)">Файл</span>
        <label className="flex h-16 cursor-pointer items-center justify-center gap-2 rounded-[var(--h-radius-control)] border border-dashed border-(--h-gold-200) px-3 text-center text-lg text-(--h-muted) hover:border-(--h-gold-500)">
          <UploadCloud className="h-4 w-4 shrink-0" aria-hidden="true" />
          {file ? file.name : "Выбрать файл (до 100 МБ)"}
          <input
            ref={fileInputRef}
            type="file"
            accept={DOCUMENT_UPLOAD_ACCEPT}
            className="sr-only"
            disabled={isBusy}
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {file && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-lg text-(--h-ink)">Название</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isBusy}
              className="h-[50px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 text-lg text-(--h-ink) focus-visible:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-lg text-(--h-ink)">Подпись/пояснение</span>
            <input
              type="text"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              disabled={isBusy}
              required
              className="h-[50px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 text-lg text-(--h-ink) focus-visible:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-lg text-(--h-ink)">Автор / источник</span>
            <input
              type="text"
              value={sourceOrOwner}
              onChange={(event) => setSourceOrOwner(event.target.value)}
              disabled={isBusy}
              className="h-[50px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 text-lg text-(--h-ink) focus-visible:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-lg text-(--h-ink)">Категория (необязательно)</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isBusy}
              className="h-[50px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 text-lg text-(--h-ink) focus-visible:outline-none"
            >
              <option value="">Без категории</option>
              {DOCUMENT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
            <span className="text-lg text-(--h-ink)">Расшифровка текста (необязательно)</span>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              disabled={isBusy}
              rows={3}
              className="rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 py-2 text-lg text-(--h-ink) focus-visible:outline-none"
            />
          </label>
        </div>
      )}

      {status === "uploading" && (
        <div className="flex flex-col gap-1 sm:max-w-[400px]">
          <div className="h-2 overflow-hidden rounded-full bg-(--h-gold-200)">
            <div
              className="h-full rounded-full bg-(--h-forest-800) transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-base text-(--h-muted)">Загружаем… {progress}%</p>
        </div>
      )}
      {status === "finalizing" && <p className="text-base text-(--h-muted)">Проверяем файл…</p>}

      {error && (
        <p role="alert" className="text-lg text-(--color-danger)">
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={!file || isBusy}
          className="flex h-[50px] w-[240px] cursor-pointer items-center justify-center rounded-[var(--h-radius-control)] bg-(--h-forest-800) px-6 text-lg font-medium text-(--h-white-warm) disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isBusy ? "Загружаем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}
