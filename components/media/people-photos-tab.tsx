"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ZoomIn } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { normalizeSearchText } from "@/features/search/normalize";
import type { MediaPickerItem } from "@/features/media/types";
import { PhotoLightbox } from "./photo-lightbox";
import { DeleteSiteMediaButton } from "./delete-site-media-button";
import styles from "./heritage-tokens.module.css";

const PAGE_SIZE = 6;

export interface PeoplePhotosTabProps {
  photos: MediaPickerItem[];
  isEditor: boolean;
}

/**
 * "Люди нашего рода" — search + gallery, no upload form here (people
 * photos are added from a person's own card, PersonMediaUpload —
 * components/forms/person-media-upload.tsx). A branch/line filter is
 * hidden for now: the schema has no real family-branch taxonomy (only
 * per-person branch_color/highlight_color hex values for tree visuals,
 * confirmed by a repo-wide search) — showing a control with no real
 * data behind it would be fake (owner's decision, docs/DECISIONS.md).
 */
export function PeoplePhotosTab({ photos, isEditor }: PeoplePhotosTabProps) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const normalized = normalizeSearchText(query);
    if (!normalized) return photos;
    return photos.filter(
      (photo) =>
        normalizeSearchText(photo.title).includes(normalized) ||
        photo.linkedPersonNames.some((name) => normalizeSearchText(name).includes(normalized)),
    );
  }, [photos, query]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className={styles.scope}>
      <div className="flex flex-col gap-3 px-[38px] py-6 sm:flex-row sm:items-center">
        <label className="relative flex-1 sm:max-w-[650px]">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-(--h-muted)"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Найти человека"
            aria-label="Найти человека по имени"
            className="h-[42px] w-full rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) pl-9 pr-3 text-lg text-(--h-ink) placeholder:text-(--h-muted) focus-visible:outline-none"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="px-[38px] pb-10 text-lg text-(--h-muted)">
          {photos.length === 0 ? "Пока нет ни одной фотографии людей." : "По этому запросу ничего не нашлось."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 px-[38px] pb-8 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((photo, index) => {
            const url = getMediaPublicUrl(photo.objectKey);
            if (!url) return null;
            return (
              <li key={photo.id} className="flex flex-col gap-2">
                <div className="group relative aspect-[438/182] w-full overflow-hidden rounded-[var(--h-radius-media)] border border-(--h-gold-200) bg-(--h-media-bg)">
                  <button type="button" onClick={() => setOpenIndex(index)} className="block h-full w-full cursor-pointer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external R2 host, arbitrary dims, object-fit:contain required (no crop) */}
                    <img
                      src={url}
                      alt={photo.caption ?? photo.title}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                    <span
                      className="absolute right-2.5 bottom-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(23,61,43,0.75)] text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden="true"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </span>
                  </button>
                  {isEditor && (
                    <DeleteSiteMediaButton
                      mediaId={photo.id}
                      linkedPersonIds={photo.linkedPersonIds}
                      title={photo.title}
                      variant="icon"
                    />
                  )}
                </div>
                <div className="min-h-[52px]">
                  <p className="font-heading text-lg text-(--h-forest-800)">{photo.title}</p>
                  {photo.linkedPersonNames.length > 0 && (
                    <p className="text-lg text-(--h-muted)">{photo.linkedPersonNames.join(", ")}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {visibleCount < filtered.length && (
        <div className="flex justify-center pb-10">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="flex h-11 w-[300px] cursor-pointer items-center justify-center gap-1 rounded-[var(--h-radius-control)] border border-(--h-gold-200) bg-(--h-paper-light) text-lg text-(--h-forest-800) hover:bg-(--h-white-warm)"
          >
            Показать ещё
          </button>
        </div>
      )}

      <p className="px-[38px] pb-8 text-center text-lg text-(--h-muted)">Фотографии добавляются из карточек людей</p>

      {openIndex !== null && visible[openIndex] && (
        <PhotoLightbox
          photos={visible}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
          footer={(photo) =>
            photo.linkedPersonIds.length > 0 && (
              <p>
                {photo.linkedPersonIds.map((personId, i) => (
                  <span key={personId}>
                    {i > 0 && ", "}
                    <Link href={`/people/${personId}`} className="underline hover:text-white">
                      {photo.linkedPersonNames[i]}
                    </Link>
                  </span>
                ))}
              </p>
            )
          }
        />
      )}
    </div>
  );
}
