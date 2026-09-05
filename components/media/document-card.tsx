import Link from "next/link";
import { FileArchive, FileText, Music, Video, ZoomIn } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { MediaPickerItem } from "@/features/media/types";
import { resolveDocumentCategory } from "@/lib/validation/document-category";
import { DeleteSiteMediaButton } from "./delete-site-media-button";

const KIND_ICONS: Partial<Record<MediaPickerItem["kind"], typeof FileText>> = {
  document: FileText,
  audio: Music,
  video: Video,
  archive: FileArchive,
  other: FileText,
};

/** True for the document kinds that are plain images (scans) — these can preview with an <img>, same MediaFrame rule as photos; everything else (PDF/DOCX/XLS/…) shows an icon tile instead. */
function isImageLikeDocument(extension: string): boolean {
  return extension === "tif" || extension === "tiff";
}

export interface DocumentCardProps {
  document: MediaPickerItem;
  isEditor: boolean;
}

/** One document tile in the gallery grid — the whole card is a real `<Link>` to /archive/[id] (master prompt §6.2: "card... открывает detail через доступный link/router navigation"). */
export function DocumentCard({ document, isEditor }: DocumentCardProps) {
  const url = getMediaPublicUrl(document.objectKey);
  const Icon = KIND_ICONS[document.kind] ?? FileText;
  const category = resolveDocumentCategory(document.category);

  return (
    <li className="group relative flex flex-col gap-2">
      <Link href={`/archive/${document.id}`} className="block">
        <div className="relative flex aspect-[327/190] w-full items-center justify-center overflow-hidden rounded-[var(--h-radius-media)] border border-(--h-gold-200) bg-(--h-media-bg)">
          {isImageLikeDocument(document.extension) && url ? (
            // eslint-disable-next-line @next/next/no-img-element -- external R2 host, arbitrary dims, object-fit:contain required (no crop)
            <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-(--h-muted)">
              <Icon className="h-9 w-9" aria-hidden="true" />
              <span className="text-label text-[11px] font-medium uppercase">{document.extension}</span>
            </div>
          )}
          <span
            className="absolute right-2.5 bottom-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(23,61,43,0.75)] text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          >
            <ZoomIn className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2 min-h-[52px]">
          <p className="font-heading text-lg text-(--h-forest-800)">{document.title}</p>
          <p className="text-lg text-(--h-muted)">
            {document.dateText ? `${document.dateText} · ` : ""}
            {category}
          </p>
        </div>
      </Link>
      {isEditor && (
        <DeleteSiteMediaButton
          mediaId={document.id}
          linkedPersonIds={document.linkedPersonIds}
          title={document.title}
          variant="icon"
        />
      )}
    </li>
  );
}
