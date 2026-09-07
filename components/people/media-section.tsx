"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Eye, FileArchive, FileText, Music, Video } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { PersonMedia } from "@/features/media/types";
import type { Person } from "@/features/people/types";
import { isImageLikeDocument } from "@/lib/media/document-kind";
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
  /** Current viewer's id, for the "edit details" permission check — null for an anonymous visitor. */
  viewerId: string | null;
  isEditor: boolean;
  /** Everyone in the tree, for LinkedPeopleManager's "add a person" search (via PhotoLightbox). */
  allPeople: Person[];
}

/** Photo gallery + document list — each document opens the shared /archive/[id] viewer (DocumentViewer), same as the site-wide archive; a plain link here would only ever offer a download. */
export function MediaSection({ media, viewerId, isEditor, allPeople }: MediaSectionProps) {
  if (media.length === 0) return null;

  const photos = media.filter((item) => item.kind === "photo");
  const documents = media.filter((item) => item.kind !== "photo");

  return (
    <div className="flex flex-col gap-6">
      {photos.length > 0 && (
        <PhotoGallery photos={photos} viewerId={viewerId} isEditor={isEditor} allPeople={allPeople} />
      )}
      {documents.length > 0 && <DocumentList documents={documents} />}
    </div>
  );
}

function PhotoGallery({
  photos,
  viewerId,
  isEditor,
  allPeople,
}: {
  photos: PersonMedia[];
  viewerId: string | null;
  isEditor: boolean;
  allPeople: Person[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section>
      <p className="text-label mb-3 text-[16px] text-(--color-fg-muted)">Фотографии</p>
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
          viewerId={viewerId}
          isEditor={isEditor}
          allPeople={allPeople}
        />
      )}
    </section>
  );
}

function DocumentList({ documents }: { documents: PersonMedia[] }) {
  return (
    <section>
      <p className="text-label mb-3 text-[16px] text-(--color-fg-muted)">Файлы</p>
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const url = getMediaPublicUrl(doc.objectKey);
          const thumbnailUrl = doc.thumbnailObjectKey ? getMediaPublicUrl(doc.thumbnailObjectKey) : null;
          const previewUrl = isImageLikeDocument(doc.extension) ? url : thumbnailUrl;
          const Icon = KIND_ICONS[doc.kind] ?? FileText;
          return (
            <li
              key={doc.id}
              className="flex items-start gap-4 rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg-elevated) p-3"
            >
              <Link
                href={`/archive/${doc.id}`}
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-(--color-border) bg-(--color-bg) text-(--color-fg-muted)"
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external, environment-configured media host, no next/image remote pattern to fix at build time
                  <img src={previewUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-0.5">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[13px] font-medium uppercase">{doc.extension}</span>
                  </div>
                )}
              </Link>
              {/* Text fills all remaining width and the actions sit below
                it (not in their own right-hand column) — a narrow panel
                left too little room for a long archival title otherwise. */}
              <div className="min-w-0 flex-1 py-0.5">
                <Link
                  href={`/archive/${doc.id}`}
                  className="block text-[18px] leading-snug font-medium text-(--color-fg) hover:text-(--color-accent)"
                >
                  {doc.title}
                </Link>
                <div className="mt-3 flex items-center gap-5">
                  <Link
                    href={`/archive/${doc.id}`}
                    className="inline-flex items-center gap-1.5 text-[16px] text-(--color-accent) hover:underline"
                  >
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                    Смотреть
                  </Link>
                  {url && (
                    <a
                      href={url}
                      download={doc.originalFilename}
                      className="inline-flex items-center gap-1.5 text-[16px] text-(--color-accent) hover:underline"
                    >
                      <Download className="h-[18px] w-[18px]" aria-hidden="true" />
                      Скачать
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
