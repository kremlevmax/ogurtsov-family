"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLoungeMessageAction } from "@/server/actions/lounge-messages";

export interface DeleteLoungeMessageButtonProps {
  messageId: string;
  buttonClassName?: string;
  errorClassName?: string;
}

/** Shown only to the message's own author or an editor (server-checked too — see the action). */
export function DeleteLoungeMessageButton({ messageId, buttonClassName, errorClassName }: DeleteLoungeMessageButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={buttonClassName}
        disabled={isPending}
        onClick={() => {
          if (!window.confirm("Удалить это сообщение?")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteLoungeMessageAction(messageId);
            if (result.ok) {
              // revalidatePath() alone (server/actions/lounge-messages.ts)
              // invalidates the cache but doesn't repaint an already-
              // mounted page — same fix as RelationshipManager's
              // handleRemove uses for the same same-page-delete case.
              router.refresh();
            } else {
              setError(result.error ?? "Не удалось удалить сообщение.");
            }
          });
        }}
      >
        {isPending ? "Удаляем…" : "Удалить"}
      </button>
      {error && (
        <span role="alert" className={errorClassName}>
          {error}
        </span>
      )}
    </>
  );
}
