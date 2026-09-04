"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { setLoungePinnedMessageAction, deleteLoungePinnedMessageAction } from "@/server/actions/lounge-pinned";
import styles from "./family-lounge.module.css";
import { LOUNGE_PINNED_LABEL } from "./fixtures";

export interface PinnedMessageEditorProps {
  /** null = nothing pinned right now. */
  initialBody: string | null;
  /** Only an editor (the owner or the owner's mother, `editors` table) may create/edit/delete this. */
  isEditor: boolean;
}

/**
 * The "ЗАКРЕПЛЕНО" banner above the feed — was fixed copy
 * (fixtures.ts's old LOUNGE_PINNED_TEXT), now a real editor-managed
 * singleton row (0014_lounge_pinned_message.sql, owner's request: an
 * editor can create, edit and delete it). A plain visitor sees nothing
 * here at all when there's nothing pinned.
 */
export function PinnedMessageEditor({ initialBody, isEditor }: PinnedMessageEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(initialBody ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setLoungePinnedMessageAction(draft);
      if (result.ok) {
        setIsEditing(false);
        // Same reason as every other lounge mutation (LikeButton,
        // DeleteLoungeMessageButton, ReplyComposer): revalidatePath()
        // inside the action invalidates the cache but doesn't repaint
        // an already-mounted page.
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось сохранить закреплённое сообщение.");
      }
    });
  }

  function remove() {
    if (!window.confirm("Удалить закреплённое сообщение?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteLoungePinnedMessageAction();
      if (result.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось удалить закреплённое сообщение.");
      }
    });
  }

  if (isEditing) {
    return (
      <div className={clsx(styles.pinned, styles.pinnedEditing)} data-testid="lounge-pinned-form">
        <label className={styles.fieldLabel} htmlFor="lounge-pinned-body">
          {LOUNGE_PINNED_LABEL}
        </label>
        <textarea
          id="lounge-pinned-body"
          className={clsx(styles.input, styles.textarea)}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          placeholder="Текст закреплённого сообщения…"
          autoFocus
          data-testid="lounge-pinned-input"
        />
        {error && (
          <p role="alert" className={styles.errorText}>
            {error}
          </p>
        )}
        <div className={styles.pinnedButtonRow}>
          <button
            type="button"
            className={clsx(styles.control, styles.controlPrimary)}
            disabled={isPending}
            onClick={save}
            data-testid="lounge-pinned-save"
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
          {initialBody && (
            <button type="button" className={styles.actionButton} disabled={isPending} onClick={remove}>
              Удалить
            </button>
          )}
          <button
            type="button"
            className={styles.replyCancel}
            onClick={() => {
              setDraft(initialBody ?? "");
              setError(null);
              setIsEditing(false);
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    );
  }

  if (!initialBody) {
    // Nothing pinned: a plain visitor sees no banner at all; only an
    // editor gets a prompt to add one.
    if (!isEditor) return null;
    return (
      <div className={clsx(styles.pinned, styles.pinnedEmpty)} data-testid="lounge-pinned">
        <button
          type="button"
          className={clsx(styles.control, styles.controlPrimary)}
          onClick={() => setIsEditing(true)}
          data-testid="lounge-pinned-add"
        >
          + Добавить закреплённое сообщение
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pinned} data-testid="lounge-pinned">
      <div className={styles.pinnedHeader}>
        <span className={styles.pinnedLabel} data-testid="lounge-pinned-label">
          <span className={styles.pinnedDot} aria-hidden="true" data-testid="lounge-pinned-dot" />
          {LOUNGE_PINNED_LABEL}
        </span>
        {isEditor && (
          <div className={styles.pinnedControls}>
            <button type="button" className={styles.actionButton} onClick={() => setIsEditing(true)}>
              Изменить
            </button>
            <button type="button" className={styles.actionButton} disabled={isPending} onClick={remove}>
              Удалить
            </button>
          </div>
        )}
      </div>
      <p className={styles.pinnedText}>{initialBody}</p>
      {error && (
        <p role="alert" className={styles.errorText}>
          {error}
        </p>
      )}
    </div>
  );
}
