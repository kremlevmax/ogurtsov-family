"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./form-field";
import { presignUploadAction, finalizeUploadAction } from "@/server/actions/media";
import { readImageDimensions, uploadWithProgress, UPLOAD_ACCEPT } from "@/lib/utils/upload";

type Status = "idle" | "uploading" | "finalizing" | "error";

export interface MediaUploadFormProps {
  personId: string;
}

export function MediaUploadForm({ personId }: MediaUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [sourceOrOwner, setSourceOrOwner] = useState("");
  const [unlisted, setUnlisted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setCaption("");
    setSourceOrOwner("");
    setUnlisted(false);
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

    setError(null);
    setStatus("uploading");
    setProgress(0);

    const presignResult = await presignUploadAction({
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
    const dimensions = await readImageDimensions(file);

    const finalizeResult = await finalizeUploadAction({
      pendingUploadId: presignResult.pendingUploadId,
      originalFilename: file.name,
      title: title.trim() || file.name,
      caption: caption.trim() || null,
      sourceOrOwner: sourceOrOwner.trim() || null,
      personId,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      unlisted,
    });

    if (!finalizeResult.ok) {
      setStatus("error");
      setError(finalizeResult.error ?? "Не удалось сохранить файл.");
      return;
    }

    reset();
    router.refresh();
  }

  const isBusy = status === "uploading" || status === "finalizing";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-inset) p-4"
    >
      <p className="text-label text-xs text-(--color-fg-muted)">Добавить фото или файл</p>

      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-(--color-border) bg-(--color-bg-elevated) px-4 py-6 text-center text-sm text-(--color-fg-muted) hover:border-(--color-accent)">
        <UploadCloud className="h-5 w-5" aria-hidden="true" />
        {file ? file.name : "Выберите файл (до 100 МБ)"}
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          disabled={isBusy}
        />
      </label>

      {file && (
        <>
          <Field label="Название">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} disabled={isBusy} />
          </Field>
          <Field label="Подпись/пояснение">
            <Input value={caption} onChange={(event) => setCaption(event.target.value)} disabled={isBusy} />
          </Field>
          <Field label="Автор / владелец оригинала">
            <Input
              value={sourceOrOwner}
              onChange={(event) => setSourceOrOwner(event.target.value)}
              disabled={isBusy}
            />
          </Field>
          <label className="flex items-start gap-2 text-sm text-(--color-fg)">
            <input
              type="checkbox"
              checked={unlisted}
              onChange={(event) => setUnlisted(event.target.checked)}
              disabled={isBusy}
              className="mt-0.5"
            />
            Не показывать в списке файлов этого человека и в общем архиве — только по прямой ссылке
          </label>
        </>
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

      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}

      <div>
        <Button type="submit" variant="secondary" disabled={!file || isBusy}>
          {isBusy ? "Загружаем…" : "Загрузить"}
        </Button>
      </div>
    </form>
  );
}
