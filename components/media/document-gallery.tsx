"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { MediaPickerItem } from "@/features/media/types";
import { normalizeSearchText } from "@/features/search/normalize";
import { resolveDocumentCategory } from "@/lib/validation/document-category";
import { ArchiveDocumentUploadForm } from "@/components/forms/archive-document-upload-form";
import { DocumentCard } from "./document-card";

const PAGE_SIZE = 6;
const GALLERY_URL_STORAGE_KEY = "archive:lastGalleryUrl";
const FORM_ID = "archive-document-upload-form";

export interface DocumentGalleryProps {
  documents: MediaPickerItem[];
  isEditor: boolean;
}

/**
 * "Документы" catalogue — search + category (category itself is picked
 * in the sidebar, this just reads the same `?category=`) + grid + load
 * more, all URL-driven (`?q=&category=&show=`) so Back from the viewer
 * restores every bit of it, per STATE_FLOW_RU.md. No search/category
 * server round-trip: the whole non-deleted document list is small
 * enough to fetch once and filter in memory (CLAUDE.md 14), same
 * pattern as the Photos tabs.
 */
export function DocumentGallery({ documents, isEditor }: DocumentGalleryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const category = searchParams.get("category");
  const visibleCount = Number(searchParams.get("show")) || PAGE_SIZE;
  const [formOpen, setFormOpen] = useState(false);

  // Remembered so the viewer's "К документам" link can restore this
  // exact search/category/pagination state even after a hard reload —
  // browser Back already does this natively via the URL itself.
  useEffect(() => {
    const qs = searchParams.toString();
    try {
      window.sessionStorage.setItem(GALLERY_URL_STORAGE_KEY, qs ? `${pathname}?${qs}` : pathname);
    } catch {
      // sessionStorage unavailable (private mode etc.) — the viewer falls back to a plain /archive link.
    }
  }, [pathname, searchParams]);

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const filtered = useMemo(() => {
    let list = documents;
    if (category) list = list.filter((doc) => resolveDocumentCategory(doc.category) === category);
    const normalized = normalizeSearchText(query);
    if (normalized) {
      list = list.filter(
        (doc) =>
          normalizeSearchText(doc.title).includes(normalized) ||
          doc.linkedPersonNames.some((name) => normalizeSearchText(name).includes(normalized)),
      );
    }
    return list;
  }, [documents, category, query]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      <div className="flex flex-col gap-3 px-[38px] pt-9 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative flex-1 sm:max-w-[470px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--h-muted)"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => updateParams({ q: event.target.value, show: null })}
            placeholder="Поиск по названию или человеку"
            aria-label="Поиск документов"
            className="h-[45px] w-full rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) pl-9 pr-3 text-lg text-(--h-ink) placeholder:text-(--h-muted) focus-visible:outline-none"
          />
        </label>
        {isEditor && (
          <button
            type="button"
            aria-expanded={formOpen}
            aria-controls={FORM_ID}
            onClick={() => setFormOpen((open) => !open)}
            className="flex h-[45px] shrink-0 cursor-pointer items-center gap-2 rounded-[var(--h-radius-control)] bg-(--h-forest-800) px-5 text-lg font-medium text-(--h-white-warm)"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить документ
          </button>
        )}
      </div>

      {formOpen && <ArchiveDocumentUploadForm id={FORM_ID} onDone={() => setFormOpen(false)} />}

      {visible.length === 0 ? (
        <p className="px-[38px] pb-10 text-lg text-(--h-muted)">
          {documents.length === 0 ? "Пока нет ни одного документа." : "По этому запросу ничего не нашлось."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 px-[38px] pb-8 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((document) => (
            <DocumentCard key={document.id} document={document} isEditor={isEditor} />
          ))}
        </ul>
      )}

      {visibleCount < filtered.length && (
        <div className="flex justify-center pb-12">
          <button
            type="button"
            onClick={() => updateParams({ show: String(visibleCount + PAGE_SIZE) })}
            className="flex h-11 w-[300px] cursor-pointer items-center justify-center gap-1 rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) text-lg text-(--h-forest-800) hover:bg-(--h-white-warm)"
          >
            Показать ещё
          </button>
        </div>
      )}
    </div>
  );
}
