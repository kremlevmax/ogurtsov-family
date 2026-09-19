"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { requestTreeAccessAction, type TreeAccessRequestState } from "@/server/actions/tree-access-request";
import type { OwnTreeAccessStatus } from "@/server/repositories/lounge-tree-access";
import { presignLoungeAttachmentAction, finalizeLoungeAttachmentAction } from "@/server/actions/lounge-attachments";
import { readImageDimensions, uploadWithProgress, UPLOAD_ACCEPT } from "@/lib/utils/upload";

const initialState: TreeAccessRequestState = { error: null, success: false };

export interface TreeAccessRequestFormProps {
  initialStatus: OwnTreeAccessStatus;
}

type AttachmentStatus = "uploading" | "done" | "error";

interface AttachmentItem {
  key: string;
  fileName: string;
  status: AttachmentStatus;
  progress: number;
  error: string | null;
  mediaId: string | null;
}

/**
 * Section 5 of "Подтверждение родства" (owner's mother's spec): the
 * "Вы уже нашли свою ветвь?" question only changes which reassurance
 * text is shown before the form — the form itself (and what happens on
 * submit) is the same either way.
 */
export function TreeAccessRequestForm({ initialStatus }: TreeAccessRequestFormProps) {
  const [state, formAction, isPending] = useActionState(requestTreeAccessAction, initialState);
  const [branch, setBranch] = useState<"unanswered" | "found" | "not-found">(
    initialStatus === "pending" || initialStatus === "rejected" ? "found" : "unanswered",
  );
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

      setAttachments((prev) => (prev.map((item) => (item.key === key ? { ...item, status: "done", mediaId: finalizeResult.mediaId ?? null } : item))));
    }
  }

  function handleRemoveAttachment(key: string) {
    setAttachments((prev) => prev.filter((item) => item.key !== key));
  }

  const isAttachmentBusy = attachments.some((item) => item.status === "uploading");

  if (initialStatus === "pending") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center text-lg text-(--color-fg) shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p className="font-heading text-2xl font-bold">Заявка уже отправлена</p>
        <p>Мы обязательно её рассмотрим. Если потребуется уточнение, мы свяжемся с вами по email.</p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center text-lg text-(--color-fg) shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p className="font-heading text-2xl font-bold">Спасибо!</p>
        <p>Ваша заявка успешно отправлена. Мы обязательно её рассмотрим.</p>
        <p>Если потребуется уточнение информации, мы свяжемся с вами по указанному адресу электронной почты.</p>
      </div>
    );
  }

  if (branch === "unanswered") {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p className="font-heading text-2xl font-bold text-(--color-fg)">Подтверждение родства</p>
        <p className="text-lg text-(--color-fg)">
          Дорогой родственник! Если Вы нашли себя или своих предков в нашем родословном дереве и хотите принять
          участие в дальнейшем развитии проекта, мы будем очень рады Вашему участию.
        </p>
        <p className="text-lg text-(--color-fg)">Вы уже нашли свою ветвь в родословном дереве?</p>
        <div className="flex gap-3">
          <Button type="button" onClick={() => setBranch("found")} className="text-base">
            Да
          </Button>
          <Button type="button" variant="secondary" onClick={() => setBranch("not-found")} className="text-base">
            Пока нет
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
      <Ornament className="h-3 w-24 text-(--color-border)" />
      {branch === "not-found" && (
        <p className="text-center text-lg text-(--color-fg)">
          Это не проблема. Напишите всё, что Вам известно о своей семье. Возможно, именно Ваши сведения помогут
          установить место Вашей ветви в родословном дереве.
        </p>
      )}
      <form action={formAction} className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ancestorRef" className="text-lg font-medium">
            От какого человека нашего дерева Вы ведёте своё происхождение? (если знаете)
          </label>
          <input
            id="ancestorRef"
            name="ancestorRef"
            type="text"
            maxLength={300}
            className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-lg text-(--color-fg) focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="aboutSelf" className="text-lg font-medium">
            Расскажите немного о себе (необязательно)
          </label>
          <p className="text-base text-(--color-fg-muted)">
            Например: где Вы живёте, что знаете о своей семье, какие семейные истории сохранились.
          </p>
          <textarea
            id="aboutSelf"
            name="aboutSelf"
            maxLength={2000}
            rows={5}
            className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-lg text-(--color-fg) focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-lg font-medium">Прикрепить материалы (необязательно)</label>
          <p className="text-base text-(--color-fg-muted)">
            Если у вас имеются материалы, связанные с историей семьи, вы можете приложить их к заявке. Можно
            прикрепить фотографии, документы, письма, воспоминания.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={(event) => {
              void handleFilesSelected(event.target.files);
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
                  <button type="button" onClick={() => handleRemoveAttachment(item.key)} className="shrink-0 underline">
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

        {state.error && (
          <p role="alert" className="text-lg text-(--color-danger)">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending || isAttachmentBusy} className="text-base">
          {isPending ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </form>
    </div>
  );
}
