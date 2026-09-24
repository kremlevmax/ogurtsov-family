"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import {
  requestTreeAccessAction,
  submitAdditionalInfoAction,
  type TreeAccessRequestState,
} from "@/server/actions/tree-access-request";
import type { OwnTreeAccessStatus } from "@/server/repositories/lounge-tree-access";
import { AttachmentPicker } from "@/components/lounge/attachment-picker";
import { useRequestAttachments } from "@/components/lounge/use-request-attachments";

const initialState: TreeAccessRequestState = { error: null, success: false };

export interface TreeAccessRequestFormProps {
  initialStatus: OwnTreeAccessStatus;
  /** The editor's question from "Запросить дополнительные сведения" — only meaningful when initialStatus is "needs_info". */
  adminNote: string | null;
}

/**
 * Section 5 of "Подтверждение родства" (owner's mother's spec): the
 * "Вы уже нашли свою ветвь?" question only changes which reassurance
 * text is shown before the form — the form itself (and what happens on
 * submit) is the same either way.
 */
export function TreeAccessRequestForm({ initialStatus, adminNote }: TreeAccessRequestFormProps) {
  const [state, formAction, isPending] = useActionState(requestTreeAccessAction, initialState);
  const [branch, setBranch] = useState<"unanswered" | "found" | "not-found">(
    initialStatus === "pending" || initialStatus === "rejected" || initialStatus === "needs_info" ? "found" : "unanswered",
  );
  // Controlled so a submit error doesn't wipe what the member already
  // typed — see lounge-register-form.tsx's fix / docs/DECISIONS.md.
  const [ancestorRef, setAncestorRef] = useState("");
  const [aboutSelf, setAboutSelf] = useState("");
  const attachmentUpload = useRequestAttachments();

  if (initialStatus === "needs_info") {
    return <ProvideAdditionalInfoCard adminNote={adminNote} />;
  }

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
            value={ancestorRef}
            onChange={(event) => setAncestorRef(event.target.value)}
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
            value={aboutSelf}
            onChange={(event) => setAboutSelf(event.target.value)}
          />
        </div>

        <AttachmentPicker
          attachments={attachmentUpload.attachments}
          fileInputRef={attachmentUpload.fileInputRef}
          onFilesSelected={attachmentUpload.handleFilesSelected}
          onRemove={attachmentUpload.handleRemoveAttachment}
        />

        {state.error && (
          <p role="alert" className="text-lg text-(--color-danger)">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending || attachmentUpload.isBusy} className="text-base">
          {isPending ? "Отправляем…" : "Отправить заявку"}
        </Button>
      </form>
    </div>
  );
}

const additionalInfoInitialState: TreeAccessRequestState = { error: null, success: false };

/**
 * Owner decision (2026-09-20): once an editor asks "Запросить
 * дополнительные сведения" (server/actions/tree-access.ts), the member
 * answers right here in their own panel — not by replying to the
 * notification email — optionally attaching files, same as the
 * original request. Submitting moves the request back to 'pending'.
 */
function ProvideAdditionalInfoCard({ adminNote }: { adminNote: string | null }) {
  const [state, formAction, isPending] = useActionState(submitAdditionalInfoAction, additionalInfoInitialState);
  const [reply, setReply] = useState("");
  const attachmentUpload = useRequestAttachments();

  if (state.success) {
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 text-center text-lg text-(--color-fg) shadow-(--shadow-md)">
        <Ornament className="h-3 w-24 text-(--color-border)" />
        <p className="font-heading text-2xl font-bold">Спасибо!</p>
        <p>Ваш ответ отправлен. Мы снова рассмотрим заявку.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-(--color-border) bg-(--color-bg-elevated) p-8 shadow-(--shadow-md)">
      <Ornament className="h-3 w-24 text-(--color-border)" />
      <p className="font-heading text-2xl font-bold text-(--color-fg)">Нужны уточнения</p>
      <p className="text-lg text-(--color-fg)">Администратор запросил дополнительные сведения по вашей заявке:</p>
      {adminNote && (
        <p className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg) px-3 py-2 text-lg whitespace-pre-line text-(--color-fg)">
          {adminNote}
        </p>
      )}
      <form action={formAction} className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="reply" className="text-lg font-medium">
            Ваш ответ
          </label>
          <textarea
            id="reply"
            name="reply"
            maxLength={2000}
            rows={5}
            required
            className="w-full rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2 text-lg text-(--color-fg) focus-visible:outline-none"
            value={reply}
            onChange={(event) => setReply(event.target.value)}
          />
        </div>

        <AttachmentPicker
          attachments={attachmentUpload.attachments}
          fileInputRef={attachmentUpload.fileInputRef}
          onFilesSelected={attachmentUpload.handleFilesSelected}
          onRemove={attachmentUpload.handleRemoveAttachment}
          label="Приложить фотографии или документы (необязательно)"
          hint="Если это поможет подтвердить родство, приложите нужные материалы."
        />

        {state.error && (
          <p role="alert" className="text-lg text-(--color-danger)">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={isPending || attachmentUpload.isBusy} className="text-base">
          {isPending ? "Отправляем…" : "Отправить"}
        </Button>
      </form>
    </div>
  );
}
