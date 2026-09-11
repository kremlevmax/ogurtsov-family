"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTranscriptAction } from "@/server/actions/media-edit";

export interface EditTranscriptFieldProps {
  mediaId: string;
  transcript: string | null;
  /** The uploader of this exact file, or either editor — same rule as EditMediaDetailsField. */
  canEdit: boolean;
}

/**
 * The "Расшифровка" tab's own inline editor (components/media/document-viewer.tsx)
 * — was read-only; owner's request to let the uploader/an editor fix it
 * later, same as title/caption/category already could. Kept separate
 * from EditMediaDetailsField instead of folding a fourth field into
 * that form: transcript lives on its own tab, not the "Описание" one,
 * and only ever needs the light (document-viewer) styling — never the
 * dark PhotoLightbox, which has no transcript tab at all.
 */
export function EditTranscriptField({ mediaId, transcript, canEdit }: EditTranscriptFieldProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(transcript ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateTranscriptAction({ mediaId, transcript: draft });
      if (result.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось сохранить расшифровку.");
      }
    });
  }

  function cancel() {
    setDraft(transcript ?? "");
    setError(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex w-full max-w-[480px] flex-col gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.stopPropagation()}
          autoFocus
          rows={8}
          placeholder="Текст расшифровки…"
          className="w-full rounded-[var(--h-radius-control,6px)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 py-2 text-lg text-(--h-ink) focus-visible:outline-none"
        />
        {error && (
          <p role="alert" className="text-xs text-(--color-danger)">
            {error}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            disabled={isPending}
            onClick={save}
            className="cursor-pointer rounded-full bg-(--h-forest-800) px-3 py-1 font-medium text-(--h-white-warm) hover:bg-(--h-forest-hover) disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
          <button type="button" onClick={cancel} className="cursor-pointer text-(--h-muted) hover:text-(--h-ink)">
            Отмена
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="whitespace-pre-line text-lg text-(--h-ink)">{transcript ?? "Расшифровка пока не добавлена."}</p>
      {canEdit && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="inline-flex cursor-pointer items-center gap-1 text-xs text-(--h-forest-800) hover:underline"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          Редактировать
        </button>
      )}
    </div>
  );
}
