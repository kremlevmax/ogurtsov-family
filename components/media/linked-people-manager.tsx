"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import type { Person } from "@/features/people/types";
import { buildDisplayName } from "@/lib/names/display-name";
import { normalizeSearchText } from "@/features/search/normalize";
import { linkMediaToPersonAction, unlinkMediaFromPersonAction } from "@/server/actions/media-edit";
import { cn } from "@/lib/utils/cn";

export interface LinkedPeopleManagerProps {
  mediaId: string;
  linkedPersonIds: string[];
  linkedPersonNames: string[];
  /** The uploader of this exact file, or either editor — same check as EditMediaDetailsField. */
  canEdit: boolean;
  /** Everyone in the tree, for the "add a person" search — omitted (empty) wherever the host page doesn't load it, in which case only removal (never adding) is offered. */
  allPeople: Person[];
  variant: "dark" | "light";
}

const VARIANT = {
  dark: {
    wrapper: "flex flex-wrap items-center justify-center gap-1.5 pt-2",
    chip: "inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/80",
    link: "hover:underline",
    remove: "text-white/50 hover:text-white",
    addButton: "inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-xs text-white/70 hover:text-white",
    panel: "w-full max-w-[420px] rounded-md border border-white/20 bg-black/60 p-3",
    input: "border-white/20 bg-white/10 text-white placeholder:text-white/40",
    result: "text-white/80 hover:bg-white/10",
  },
  light: {
    wrapper: "flex flex-wrap items-center gap-1.5",
    chip: "inline-flex items-center gap-1 rounded-[var(--h-radius-chip)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 py-1.5 text-lg text-(--h-forest-800)",
    link: "hover:bg-(--h-white-warm)",
    remove: "text-(--h-muted) hover:text-(--color-danger)",
    addButton:
      "inline-flex items-center gap-1 rounded-[var(--h-radius-chip)] border border-dashed border-(--h-gold-200) px-3 py-1.5 text-lg text-(--h-forest-800) hover:border-(--h-gold-500)",
    panel: "w-full max-w-[420px] rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) p-3",
    input: "border-(--h-gold-200) bg-(--h-white-warm) text-(--h-ink)",
    result: "text-(--h-ink) hover:bg-(--h-white-warm)",
  },
} as const;

/**
 * Who a photo/document is linked to (CLAUDE.md 3.7: один объект может
 * быть связан с несколькими людьми) — a read-only list of chips for
 * everyone, plus (when `canEdit`) an "×" to unlink and a search-to-add
 * control for attaching one more person. Used in both PhotoLightbox and
 * DocumentViewer, replacing what used to be a plain read-only list in
 * each.
 */
export function LinkedPeopleManager({
  mediaId,
  linkedPersonIds,
  linkedPersonNames,
  canEdit,
  allPeople,
  variant,
}: LinkedPeopleManagerProps) {
  const router = useRouter();
  const styleSet = VARIANT[variant];
  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [pendingPersonId, setPendingPersonId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function unlink(personId: string) {
    setError(null);
    setPendingPersonId(personId);
    startTransition(async () => {
      const result = await unlinkMediaFromPersonAction(mediaId, personId);
      setPendingPersonId(null);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Не удалось отвязать человека.");
    });
  }

  function link(personId: string) {
    setError(null);
    setPendingPersonId(personId);
    startTransition(async () => {
      const result = await linkMediaToPersonAction(mediaId, personId);
      setPendingPersonId(null);
      if (result.ok) {
        setIsAdding(false);
        setQuery("");
        router.refresh();
      } else {
        setError(result.error ?? "Не удалось привязать человека.");
      }
    });
  }

  const normalizedQuery = normalizeSearchText(query);
  const candidates = allPeople.filter((person) => !linkedPersonIds.includes(person.id));
  const results = normalizedQuery
    ? candidates.filter((person) => normalizeSearchText(buildDisplayName(person)).includes(normalizedQuery))
    : candidates;

  if (linkedPersonIds.length === 0 && !canEdit) return null;

  return (
    <div className={styleSet.wrapper}>
      {linkedPersonIds.map((personId, index) => (
        <span key={personId} className={styleSet.chip}>
          <Link href={`/people/${personId}`} className={styleSet.link}>
            {linkedPersonNames[index]}
          </Link>
          {canEdit && (
            <button
              type="button"
              onClick={() => unlink(personId)}
              disabled={isPending && pendingPersonId === personId}
              aria-label={`Отвязать ${linkedPersonNames[index]}`}
              className={cn("cursor-pointer disabled:cursor-not-allowed", styleSet.remove)}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
        </span>
      ))}

      {canEdit && allPeople.length > 0 && !isAdding && (
        <button type="button" onClick={() => setIsAdding(true)} className={cn("cursor-pointer", styleSet.addButton)}>
          <Plus className="h-3 w-3" aria-hidden="true" />
          Добавить человека
        </button>
      )}

      {canEdit && isAdding && (
        <div className={styleSet.panel}>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 opacity-60" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              autoFocus
              placeholder="Найти человека…"
              className={cn("w-full rounded-[var(--h-radius-control,6px)] border py-1.5 pr-2 pl-8 text-sm focus-visible:outline-none", styleSet.input)}
            />
          </div>
          <ul className="mt-2 flex max-h-40 flex-col gap-0.5 overflow-y-auto">
            {results.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => link(person.id)}
                  disabled={isPending && pendingPersonId === person.id}
                  className={cn("w-full cursor-pointer rounded px-2 py-1 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60", styleSet.result)}
                >
                  {isPending && pendingPersonId === person.id ? "Добавляем…" : buildDisplayName(person)}
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-2 py-1 text-sm opacity-60">Никого не нашлось.</li>}
          </ul>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setQuery("");
            }}
            className={cn("mt-2 cursor-pointer text-xs", styleSet.remove)}
          >
            Закрыть
          </button>
        </div>
      )}

      {error && <p role="alert" className="w-full text-xs text-(--color-danger)">{error}</p>}
    </div>
  );
}
