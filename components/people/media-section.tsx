"use client";

import { useState } from "react";
import { Download, FileArchive, FileText, Music, Video } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { PersonMedia } from "@/features/media/types";
import { formatFileSize } from "@/lib/media/format";
import { PhotoLightbox } from "@/components/media/photo-lightbox";

const KIND_ICONS: Partial<Record<PersonMedia["kind"], typeof FileText>> = {
  document: FileText,
  audio: Music,
  video: Video,
  archive: FileArchive,
  other: FileText,
};

export interface MediaSectionProps {
  media: PersonMedia[];
}

/** Photo gallery + downloadable document list — CLAUDE.md 3.7: documents always download, photos show inline. */
export function MediaSection({ media }: MediaSectionProps) {
  if (media.length === 0) return null;

  const photos = media.filter((item) => item.kind === "photo");
  const documents = media.filter((item) => item.kind !== "photo");

  return (
    <div className="flex flex-col gap-6">
      {photos.length > 0 && <PhotoGallery photos={photos} />}
      {documents.length > 0 && <DocumentList documents={documents} />}
    </div>
  );
}

function PhotoGallery({ photos }: { photos: PersonMedia[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section>
      <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Фотографии</p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, index) => {
          const url = getMediaPublicUrl(photo.objectKey);
          if (!url) return null;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              className="aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated)"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external, environment-configured media host, no next/image remote pattern to fix at build time */}
              <img
                src={url}
                alt={photo.caption ?? photo.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      )}
    </section>
  );
}

function DocumentList({ documents }: { documents: PersonMedia[] }) {
  return (
    <section>
      <p className="text-label mb-3 text-xs text-(--color-fg-muted)">Файлы</p>
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const url = getMediaPublicUrl(doc.objectKey);
          const Icon = KIND_ICONS[doc.kind] ?? FileText;
          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2.5"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] border border-(--color-border) text-(--color-fg-muted)">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-[9px] font-medium uppercase">{doc.extension}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-(--color-fg)">{doc.title}</p>
                <p className="truncate text-xs text-(--color-fg-muted)">
                  {doc.caption ? `${doc.caption} · ` : ""}
                  {formatFileSize(doc.sizeBytes)}
                </p>
              </div>
              {url && (
                <a
                  href={url}
                  download={doc.originalFilename}
                  className="text-label inline-flex shrink-0 items-center gap-1 text-[10px] text-(--color-accent) hover:underline"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Скачать
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
