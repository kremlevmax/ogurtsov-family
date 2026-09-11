"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { MediaKind } from "@/lib/supabase/types";
import { updateMediaDetailsAction } from "@/server/actions/media-edit";
import { DOCUMENT_CATEGORIES } from "@/lib/validation/document-category";
import { formatMediaDate } from "@/lib/media/format";
import { cn } from "@/lib/utils/cn";

export interface EditMediaDetailsFieldProps {
  mediaId: string;
  kind: MediaKind;
  title: string;
  caption: string | null;
  /** Documents only — the field stays hidden for any other kind. */
  category: string | null;
  /** Free-text approximate year/date — photos and documents both. */
  dateText: string | null;
  /** The uploader of this exact file, or either editor (owner's request) — computed by the caller from `media.created_by` and the viewer. */
  canEdit: boolean;
  /** "dark" — over a photo in the full-screen lightbox. "light" — inside the archive document viewer's own panel. */
  variant: "dark" | "light";
}

const VARIANT = {
  dark: {
    wrapper: "flex flex-col items-center gap-1.5 pt-2 text-center",
    text: "text-sm text-white/70",
    editButton: "text-white/60 hover:text-white",
    label: "text-xs text-white/50",
    input: "border-white/20 bg-white/10 text-white placeholder:text-white/40",
    save: "bg-white text-black hover:bg-white/90",
    cancel: "text-white/60 hover:text-white",
    error: "text-red-300",
  },
  light: {
    wrapper: "flex flex-col items-start gap-2",
    text: "text-lg text-(--h-ink)",
    editButton: "text-(--h-forest-800) hover:underline",
    label: "text-sm text-(--h-muted)",
    input: "border-(--h-gold-200) bg-(--h-paper-light) text-(--h-ink)",
    save: "bg-(--h-forest-800) text-(--h-white-warm) hover:bg-(--h-forest-hover)",
    cancel: "text-(--h-muted) hover:text-(--h-ink)",
    error: "text-(--color-danger)",
  },
} as const;

/**
 * Inline editor for an already-uploaded photo or document's title,
 * caption and (documents only) category — owner's request: the person
 * who uploaded a file, or either editor, should be able to fix all of
 * these later, not only set them once at upload time. One shared
 * isEditing/draft/Save-Cancel form for all three fields at once (not
 * three separate inline editors), same shape as
 * components/lounge/pinned-message-editor.tsx, adapted to sit inside
 * two very different hosts (the dark full-screen PhotoLightbox and the
 * light archive DocumentViewer panel) via `variant`. The host still
 * displays `title` (and, for documents, the resolved category) in its
 * own normal spot — this component only replaces the caption line and
 * grows to a small form when editing, refreshing the whole page on
 * save so the host's own title/category display updates too.
 */
export function EditMediaDetailsField({ mediaId, kind, title, caption, category, dateText, canEdit, variant }: EditMediaDetailsFieldProps) {
  const router = useRouter();
  const styleSet = VARIANT[variant];
  const showCategory = kind === "document";
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftCaption, setDraftCaption] = useState(caption ?? "");
  const [draftCategory, setDraftCategory] = useState(category ?? "");
  const [draftDateText, setDraftDateText] = useState(dateText ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    if (!draftTitle.trim()) {
      setError("Укажите название.");
      return;
    }
    if (!draftCaption.trim()) {
      setError("Укажите подпись или пояснение.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateMediaDetailsAction({
        mediaId,
        title: draftTitle,
        caption: draftCaption,
        category: showCategory ? draftCategory || null : null,
        dateText: draftDateText,
      });
      if (result.ok) {
        setIsEditing(false);
        // revalidatePath() inside the action invalidates the cache but
        // doesn't repaint an already-mounted page (same reason as every
        // other lounge/media mutation in this codebase).
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось сохранить изменения.");
      }
    });
  }

  function cancel() {
    setDraftTitle(title);
    setDraftCaption(caption ?? "");
    setDraftCategory(category ?? "");
    setDraftDateText(dateText ?? "");
    setError(null);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className={cn(styleSet.wrapper, "w-full max-w-[480px]")}>
        <label className="flex w-full flex-col gap-1">
          <span className={styleSet.label}>Название</span>
          <input
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            className={cn("w-full rounded-[var(--h-radius-control,6px)] border px-3 py-2 text-sm focus-visible:outline-none", styleSet.input)}
          />
        </label>
        <label className="flex w-full flex-col gap-1">
          <span className={styleSet.label}>Подпись/пояснение</span>
          <textarea
            value={draftCaption}
            onChange={(event) => setDraftCaption(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            autoFocus
            rows={2}
            className={cn("w-full rounded-[var(--h-radius-control,6px)] border px-3 py-2 text-sm focus-visible:outline-none", styleSet.input)}
          />
        </label>
        <label className="flex w-full flex-col gap-1">
          <span className={styleSet.label}>Примерный год</span>
          <input
            value={draftDateText}
            onChange={(event) => setDraftDateText(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder="например, около 1980"
            maxLength={40}
            className={cn("w-full rounded-[var(--h-radius-control,6px)] border px-3 py-2 text-sm focus-visible:outline-none", styleSet.input)}
          />
        </label>
        {showCategory && (
          <label className="flex w-full flex-col gap-1">
            <span className={styleSet.label}>Категория</span>
            <select
              value={draftCategory}
              onChange={(event) => setDraftCategory(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              className={cn("w-full rounded-[var(--h-radius-control,6px)] border px-3 py-2 text-sm focus-visible:outline-none", styleSet.input)}
            >
              <option value="">Без категории</option>
              {DOCUMENT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && (
          <p role="alert" className={cn("text-xs", styleSet.error)}>
            {error}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            disabled={isPending}
            onClick={save}
            className={cn("cursor-pointer rounded-full px-3 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-60", styleSet.save)}
          >
            {isPending ? "Сохраняем…" : "Сохранить"}
          </button>
          <button type="button" onClick={cancel} className={cn("cursor-pointer", styleSet.cancel)}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  // A plain visitor looking at a photo with no caption/year sees nothing
  // at all (the lightbox's original behaviour) — only the document
  // viewer's "Описание" tab always shows a line, caption or fallback.
  if (!caption && !dateText && !canEdit) {
    return variant === "light" ? <p className={styleSet.text}>Описание пока не добавлено.</p> : null;
  }

  return (
    <div className={styleSet.wrapper}>
      {dateText && <p className={styleSet.label}>{formatMediaDate(dateText)}</p>}
      {caption && <p className={styleSet.text}>{caption}</p>}
      {canEdit && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={cn("inline-flex cursor-pointer items-center gap-1 text-xs", styleSet.editButton)}
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
          Редактировать
        </button>
      )}
    </div>
  );
}
