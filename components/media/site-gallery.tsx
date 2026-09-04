"use client";

import { useState } from "react";
import Link from "next/link";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { MediaPickerItem } from "@/features/media/types";
import { PhotoLightbox } from "./photo-lightbox";
import { DeleteSiteMediaButton } from "./delete-site-media-button";

export interface SiteGalleryProps {
  photos: MediaPickerItem[];
  /** Shows a delete button per photo when true — editors only (CLAUDE.md 5.3: both editors have equal write rights). */
  isEditor?: boolean;
}

/** Every photo across the whole family tree — CLAUDE.md 3.7 gallery, separate from any one person's card. */
export function SiteGallery({ photos, isEditor = false }: SiteGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return <p className="text-sm text-(--color-fg-muted)">Пока нет ни одной фотографии.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {photos.map((photo, index) => {
          const url = getMediaPublicUrl(photo.objectKey);
          if (!url) return null;
          return (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated)"
            >
              <button type="button" onClick={() => setOpenIndex(index)} className="block h-full w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={photo.caption ?? photo.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
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
          );
        })}
      </div>

      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
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
    </>
  );
}
