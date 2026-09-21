"use client";

import { Button } from "@/components/ui/button";
import { UPLOAD_ACCEPT } from "@/lib/utils/upload";
import type { AttachmentItem } from "@/components/lounge/use-request-attachments";

export interface AttachmentPickerProps {
  attachments: AttachmentItem[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (files: FileList | null) => void;
  onRemove: (key: string) => void;
  label?: string;
  hint?: string;
}

/** File-picker + upload-progress list shared by both TreeAccessRequestForm attachment steps (see use-request-attachments.ts). */
export function AttachmentPicker({
  attachments,
  fileInputRef,
  onFilesSelected,
  onRemove,
  label = "Прикрепить материалы (необязательно)",
  hint = "Если у вас имеются материалы, связанные с историей семьи, вы можете приложить их. Можно прикрепить фотографии, документы, письма, воспоминания.",
}: AttachmentPickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-lg font-medium">{label}</label>
      <p className="text-base text-(--color-fg-muted)">{hint}</p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          void onFilesSelected(event.target.files);
          event.target.value = "";
        }}
      />
      <Button type="button" variant="secondary" className="w-fit text-base" onClick={() => fileInputRef.current?.click()}>
        Прикрепить файлы
      </Button>
      {attachments.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {attachments.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-2 text-base text-(--color-fg-muted)">
              <span className="truncate">
                {item.fileName}
                {item.status === "uploading" && ` — загрузка ${item.progress}%`}
                {item.status === "error" && ` — ${item.error}`}
              </span>
              <button type="button" onClick={() => onRemove(item.key)} className="shrink-0 underline">
                Убрать
              </button>
            </li>
          ))}
        </ul>
      )}
      {attachments
        .filter((item) => item.status === "done" && item.mediaId)
        .map((item) => (
          <input key={item.key} type="hidden" name="mediaIds" value={item.mediaId ?? ""} />
        ))}
    </div>
  );
}
