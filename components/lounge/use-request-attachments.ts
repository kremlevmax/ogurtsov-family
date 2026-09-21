"use client";

import { useRef, useState } from "react";
import { presignLoungeAttachmentAction, finalizeLoungeAttachmentAction } from "@/server/actions/lounge-attachments";
import { readImageDimensions, uploadWithProgress } from "@/lib/utils/upload";

type AttachmentStatus = "uploading" | "done" | "error";

export interface AttachmentItem {
  key: string;
  fileName: string;
  status: AttachmentStatus;
  progress: number;
  error: string | null;
  mediaId: string | null;
}

/**
 * Upload state/handlers shared by TreeAccessRequestForm's two file
 * pickers — the original request ("Прикрепить материалы") and the
 * reply to "Запросить дополнительные сведения" — both attach files the
 * same way (presign → upload → finalize, same as a lounge message's
 * photo), just to different forms. The finished mediaId list is read
 * out via `attachments` and rendered as hidden `mediaIds` inputs by the
 * caller; attaching them to the request row happens server-side once
 * the form submits (server/actions/tree-access-request.ts).
 */
export function useRequestAttachments() {
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const key = `${file.name}-${file.size}-${crypto.randomUUID()}`;
      setAttachments((prev) => [...prev, { key, fileName: file.name, status: "uploading", progress: 0, error: null, mediaId: null }]);

      const presignResult = await presignLoungeAttachmentAction({
        originalFilename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      if (!presignResult.ok || !presignResult.uploadUrl || !presignResult.pendingUploadId) {
        setAttachments((prev) =>
          prev.map((item) => (item.key === key ? { ...item, status: "error", error: presignResult.error ?? "Не удалось подготовить загрузку." } : item)),
        );
        continue;
      }

      try {
        await uploadWithProgress(presignResult.uploadUrl, file, file.type || "application/octet-stream", (percent) =>
          setAttachments((prev) => prev.map((item) => (item.key === key ? { ...item, progress: percent } : item))),
        );
      } catch (uploadError) {
        setAttachments((prev) =>
          prev.map((item) =>
            item.key === key ? { ...item, status: "error", error: uploadError instanceof Error ? uploadError.message : "Загрузка не удалась." } : item,
          ),
        );
        continue;
      }

      const dimensions = await readImageDimensions(file);
      const finalizeResult = await finalizeLoungeAttachmentAction({
        pendingUploadId: presignResult.pendingUploadId,
        originalFilename: file.name,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      });
      if (!finalizeResult.ok || !finalizeResult.mediaId) {
        setAttachments((prev) =>
          prev.map((item) => (item.key === key ? { ...item, status: "error", error: finalizeResult.error ?? "Не удалось сохранить файл." } : item)),
        );
        continue;
      }

      setAttachments((prev) => prev.map((item) => (item.key === key ? { ...item, status: "done", mediaId: finalizeResult.mediaId ?? null } : item)));
    }
  }

  function handleRemoveAttachment(key: string) {
    setAttachments((prev) => prev.filter((item) => item.key !== key));
  }

  return {
    attachments,
    fileInputRef,
    handleFilesSelected,
    handleRemoveAttachment,
    isBusy: attachments.some((item) => item.status === "uploading"),
  };
}
