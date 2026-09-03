"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createLoungeMessageAction, type LoungeMessageActionState } from "@/server/actions/lounge-messages";

export interface ReplyComposerProps {
  parentMessageId: string;
  onDone: () => void;
  formClassName?: string;
  textareaClassName?: string;
  buttonRowClassName?: string;
  submitClassName?: string;
  cancelClassName?: string;
  errorClassName?: string;
}

const initialState: LoungeMessageActionState = { ok: false };

/** Inline reply form under a message — a single-level reply, no topic/attachment (0013_lounge_message_replies.sql). */
export function ReplyComposer({
  parentMessageId,
  onDone,
  formClassName,
  textareaClassName,
  buttonRowClassName,
  submitClassName,
  cancelClassName,
  errorClassName,
}: ReplyComposerProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createLoungeMessageAction, initialState);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (state.ok) {
      router.refresh();
      onDone();
    }
    // Deliberately not depending on onDone/router — both are stable
    // enough here and re-running this on their identity would risk
    // firing the refresh a second time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className={formClassName}>
      <input type="hidden" name="parentMessageId" value={parentMessageId} />
      <textarea
        name="body"
        required
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Написать ответ…"
        className={textareaClassName}
        autoFocus
      />
      {state.error && (
        <p role="alert" className={errorClassName}>
          {state.error}
        </p>
      )}
      <div className={buttonRowClassName}>
        <button type="submit" disabled={isPending} className={submitClassName}>
          {isPending ? "Отправляем…" : "Отправить"}
        </button>
        <button type="button" onClick={onDone} className={cancelClassName}>
          Отмена
        </button>
      </div>
    </form>
  );
}
