"use client";

import { useState } from "react";
import { Plus, ZoomIn } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { MediaPickerItem } from "@/features/media/types";
import { PlacesUploadForm } from "@/components/forms/places-upload-form";
import { PhotoLightbox } from "./photo-lightbox";
import { DeleteSiteMediaButton } from "./delete-site-media-button";

const PAGE_SIZE = 6;
const FORM_ID = "places-upload-form";

export interface PlacesPhotosTabProps {
  photos: MediaPickerItem[];
  /** Any registered member can add place photos (same RLS as person-photo uploads) — hidden for anonymous visitors rather than showing a button that just bounces to /login. */
  isMember: boolean;
  isEditor: boolean;
}

/**
 * "Места нашей истории" — no search/branch here (spec: absent on this
 * tab). The add button toggles PlacesUploadForm directly under the
 * gallery; closed state reserves no height at all (the form isn't
 * rendered, not just visually hidden).
 */
export function PlacesPhotosTab({ photos, isMember, isEditor }: PlacesPhotosTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = photos.slice(0, visibleCount);

  return (
    <div>
      <div className="flex justify-end px-[38px] py-6">
        {isMember && (
          <button
            type="button"
            aria-expanded={formOpen}
            aria-controls={FORM_ID}
            onClick={() => setFormOpen((open) => !open)}
            className="flex h-[43px] cursor-pointer items-center gap-2 rounded-[var(--h-radius-control)] bg-(--h-forest-800) px-5 text-lg font-medium text-(--h-white-warm)"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Добавить фотографии
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="px-[38px] pb-10 text-lg text-(--h-muted)">Пока нет ни одной фотографии мест.</p>
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
                    <DeleteSiteMediaButton mediaId={photo.id} linkedPersonIds={[]} title={photo.title} variant="icon" />
                  )}
                </div>
                <div className="min-h-[52px]">
                  <p className="font-heading text-lg text-(--h-forest-800)">{photo.title}</p>
                  {photo.dateText && <p className="text-lg text-(--h-muted)">{photo.dateText}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {visibleCount < photos.length && (
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

      {!formOpen && (
        <p className="px-[38px] pb-8 text-center text-lg text-(--h-muted)">
          Фотографии мест открываются крупно в исходных пропорциях
        </p>
      )}

      {formOpen && <PlacesUploadForm id={FORM_ID} onDone={() => setFormOpen(false)} />}

      {openIndex !== null && visible[openIndex] && (
        <PhotoLightbox photos={visible} index={openIndex} onClose={() => setOpenIndex(null)} onIndexChange={setOpenIndex} />
      )}
    </div>
  );
}
