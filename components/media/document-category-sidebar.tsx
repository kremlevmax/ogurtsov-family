"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BookMarked, BookOpen, FolderOpen, Landmark, Mail, Files, User } from "lucide-react";
import { DOCUMENT_CATEGORIES, type DocumentCategory } from "@/lib/validation/document-category";

const CATEGORY_ICONS: Record<DocumentCategory, typeof BookOpen> = {
  "Старинные документы": BookOpen,
  "Личные документы": User,
  Письма: Mail,
  "Семейные истории": BookMarked,
  "Ответы архивов и справки": Landmark,
  "Другие документы": Files,
};

export interface DocumentCategorySidebarProps {
  /** Document count per category label, plus "Все документы" under the empty-string key. */
  counts: Record<string, number>;
}

/**
 * Left-hand category menu — stays visible in both the gallery and
 * viewer states (owner's Figma handoff: "sidebar остаётся"). Active
 * category lives in `?category=`, same URL-based approach as the
 * gallery's search/pagination, so Back/reload restore it without extra
 * code (STATE_FLOW_RU.md).
 */
export function DocumentCategorySidebar({ counts }: DocumentCategorySidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  function linkFor(category: string | null) {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    params.delete("documentId");
    if (category) params.set("category", category);
    const query = params.toString();
    return `/archive${query ? `?${query}` : ""}`;
  }

  function go(category: string | null) {
    router.push(linkFor(category));
  }

  return (
    <nav className="flex flex-col gap-1 px-[38px] pt-9" aria-label="Категории документов">
      <h1 className="font-heading text-4xl text-(--h-forest-800)">Документы</h1>
      <div className="mt-6 flex flex-col gap-1">
        <CategoryButton
          label="Все документы"
          icon={FolderOpen}
          active={!activeCategory}
          count={counts[""] ?? 0}
          onClick={() => go(null)}
        />
        {DOCUMENT_CATEGORIES.map((category) => (
          <CategoryButton
            key={category}
            label={category}
            icon={CATEGORY_ICONS[category]}
            active={activeCategory === category}
            count={counts[category] ?? 0}
            onClick={() => go(category)}
          />
        ))}
      </div>
    </nav>
  );
}

function CategoryButton({
  label,
  icon: Icon,
  active,
  count,
  onClick,
}: {
  label: string;
  icon: typeof BookOpen;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={
        active
          ? "flex cursor-pointer items-center gap-2.5 rounded-[var(--h-radius-control)] bg-(--h-forest-800) px-3 py-2.5 text-left text-lg text-(--h-white-warm)"
          : "flex cursor-pointer items-center gap-2.5 rounded-[var(--h-radius-control)] px-3 py-2.5 text-left text-lg text-(--h-ink) hover:bg-(--h-media-bg)"
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <span className={active ? "text-(--h-white-warm)/70" : "text-(--h-muted)"}>{count}</span>
    </button>
  );
}
