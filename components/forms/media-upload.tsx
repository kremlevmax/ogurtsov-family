"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./form-field";
import { presignUploadAction, finalizeUploadAction } from "@/server/actions/media";

const ACCEPT =
  ".jpg,.jpeg,.png,.webp,.avif,.gif,.tif,.tiff,.pdf,.txt,.rtf,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.mp3,.m4a,.aac,.wav,.flac,.ogg,.mp4,.mov,.m4v,.webm,.zip,.7z,.tar,.gz";

type Status = "idle" | "uploading" | "finalizing" | "error";

function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/** Direct-to-R2 PUT with upload progress — `fetch` can't report progress, so this uses XHR (CLAUDE.md 10: upload progress is a required UI state). */
function uploadWithProgress(url: string, file: File, contentType: string, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Загрузка не удалась (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Загрузка не удалась. Проверьте соединение."));
    xhr.send(file);
  });
}

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
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setTitle("");
    setCaption("");
    setSourceOrOwner("");
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
          accept={ACCEPT}
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
