"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Search } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { MediaPickerItem } from "@/features/media/types";
import { linkExistingMediaAction } from "@/server/actions/media";
import { normalizeSearchText } from "@/features/search/normalize";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface LinkExistingMediaProps {
  personId: string;
  /** Every uploaded file site-wide except what's already linked to this person. */
  candidates: MediaPickerItem[];
}

/** Attaches an already-uploaded photo/file to this person too, instead of uploading the same bytes again (CLAUDE.md 3.7). */
export function LinkExistingMedia({ personId, candidates }: LinkExistingMediaProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  if (candidates.length === 0) return null;

  const normalizedQuery = normalizeSearchText(query);
  const results = normalizedQuery
    ? candidates.filter((item) => {
        const haystack = normalizeSearchText([item.title, item.caption ?? "", ...item.linkedPersonNames].join(" "));
        return haystack.includes(normalizedQuery);
      })
    : candidates;

  function handleLink(mediaId: string) {
    setError(null);
    setLinkingId(mediaId);
    startTransition(async () => {
      const result = await linkExistingMediaAction(personId, mediaId);
      setLinkingId(null);
      if (result.ok) router.refresh();
      else setError(result.error ?? "Не удалось привязать файл.");
    });
  }

  if (!isOpen) {
    return (
      <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
        <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
        Прикрепить уже загруженный файл
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border) bg-(--color-bg-inset) p-4">
      <div className="flex items-center justify-between">
        <p className="text-label text-xs text-(--color-fg-muted)">Прикрепить уже загруженный файл</p>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-label text-[10px] text-(--color-fg-muted) hover:text-(--color-accent)"
        >
          Свернуть
        </button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-fg-muted)"
          aria-hidden="true"
        />
        <Input
          placeholder="Найти по названию или по человеку…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
        />
      </div>

      <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {results.map((item) => {
          const url = getMediaPublicUrl(item.objectKey);
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2"
            >
              {item.kind === "photo" && url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-[var(--radius-sm)] border border-(--color-border) object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-(--color-border) text-(--color-fg-muted)">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--color-fg)">{item.title}</p>
                <p className="truncate text-xs text-(--color-fg-muted)">
                  {item.linkedPersonNames.length > 0
                    ? `Уже привязано: ${item.linkedPersonNames.join(", ")}`
                    : "Пока никому не привязано"}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => handleLink(item.id)}
                disabled={isPending && linkingId === item.id}
              >
                {isPending && linkingId === item.id ? "Прикрепляем…" : "Прикрепить"}
              </Button>
            </li>
          );
        })}
        {results.length === 0 && <p className="text-sm text-(--color-fg-muted)">Ничего не найдено.</p>}
      </ul>

      {error && (
        <p role="alert" className="text-sm text-(--color-danger)">
          {error}
        </p>
      )}
    </div>
  );
}
