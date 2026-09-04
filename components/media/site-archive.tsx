import Link from "next/link";
import { Download, FileArchive, FileText, Music, Video } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import type { MediaPickerItem } from "@/features/media/types";
import { formatFileSize } from "@/lib/media/format";
import { DeleteArchiveMediaButton } from "./delete-archive-media-button";

const KIND_ICONS: Partial<Record<MediaPickerItem["kind"], typeof FileText>> = {
  document: FileText,
  audio: Music,
  video: Video,
  archive: FileArchive,
  other: FileText,
  photo: FileText,
};

export interface SiteArchiveProps {
  documents: MediaPickerItem[];
  /** Shows a delete button per file when true — editors only (CLAUDE.md 5.3: both editors have equal write rights). */
  isEditor?: boolean;
}

/** Every document/file across the whole family tree — CLAUDE.md 3.7 archive, separate from any one person's card. */
export function SiteArchive({ documents, isEditor = false }: SiteArchiveProps) {
  if (documents.length === 0) {
    return <p className="text-sm text-(--color-fg-muted)">Пока нет ни одного файла.</p>;
  }

  return (
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
                {formatFileSize(doc.sizeBytes)}
                {doc.linkedPersonIds.length > 0 && (
                  <>
                    {" · "}
                    {doc.linkedPersonIds.map((personId, i) => (
                      <span key={personId}>
                        {i > 0 && ", "}
                        <Link href={`/people/${personId}`} className="hover:text-(--color-accent) hover:underline">
                          {doc.linkedPersonNames[i]}
                        </Link>
                      </span>
                    ))}
                  </>
                )}
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
            {isEditor && (
              <DeleteArchiveMediaButton mediaId={doc.id} linkedPersonIds={doc.linkedPersonIds} title={doc.title} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
