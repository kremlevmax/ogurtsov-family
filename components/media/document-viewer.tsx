"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  FileText,
  Maximize,
  Minimize,
  Music,
  Video,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { DocumentDetail } from "@/features/media/types";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { formatFileSize } from "@/lib/media/format";
import { resolveDocumentCategory } from "@/lib/validation/document-category";
import { cn } from "@/lib/utils/cn";
import { PdfPageView } from "./pdf-page-view";

const GALLERY_URL_STORAGE_KEY = "archive:lastGalleryUrl";
const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

const KIND_ICONS: Partial<Record<DocumentDetail["kind"], typeof FileText>> = {
  document: FileText,
  audio: Music,
  video: Video,
  archive: FileArchive,
  other: FileText,
};

const TABS = [
  { key: "description", label: "Описание" },
  { key: "transcript", label: "Расшифровка" },
  { key: "source", label: "Источник" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function isImageLikeDocument(extension: string): boolean {
  return extension === "tif" || extension === "tiff";
}

export interface DocumentViewerProps {
  document: DocumentDetail;
}

/**
 * `/archive/[documentId]` — completely replaces DocumentGallery in the
 * shared layout's main slot (mutual exclusion by routing, not a
 * ternary — see app/(public)/archive/layout.tsx).
 */
export function DocumentViewer({ document: doc }: DocumentViewerProps) {
  const url = getMediaPublicUrl(doc.objectKey);
  const isPdf = doc.mimeType === "application/pdf";
  const isImage = isImageLikeDocument(doc.extension);
  const isAudio = doc.kind === "audio";
  const isVideo = doc.kind === "video";
  const hasPreview = isPdf || isImage || isAudio || isVideo;
  const canZoom = isPdf || isImage;

  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [scale, setScale] = useState(1);
  const [renderFailed, setRenderFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [galleryHref, setGalleryHref] = useState("/archive");
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(GALLERY_URL_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only API (sessionStorage) post-hydration; the initial SSR-safe "/archive" render must stay until this runs
      if (stored) setGalleryHref(stored);
    } catch {
      // sessionStorage unavailable (private mode etc.) — plain /archive fallback stays.
    }
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === frameRef.current);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await frameRef.current?.requestFullscreen();
    }
  }

  const Icon = KIND_ICONS[doc.kind] ?? FileText;
  const category = resolveDocumentCategory(doc.category);
  const meta = [doc.dateText, category].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="flex flex-col gap-6 px-[38px] py-9">
        <div>
          <Link
            href={galleryHref}
            className="inline-flex items-center gap-1.5 text-lg text-(--h-forest-800) hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />К документам
          </Link>
        </div>

        <div>
          <h1 className="font-heading text-3xl text-(--h-forest-800)">{doc.title}</h1>
          {meta && <p className="mt-1 text-lg text-(--h-muted)">{meta}</p>}
        </div>

        <div
          ref={frameRef}
          className={cn(
            "relative flex min-h-[360px] items-center justify-center overflow-auto rounded-[var(--h-radius-panel)] border border-(--h-gold-200) bg-(--h-media-bg) p-6",
            isFullscreen && "bg-(--h-paper)",
          )}
        >
          {url && hasPreview && !renderFailed ? (
            <>
              {isPdf && (
                <PdfPageView
                  url={url}
                  pageNumber={pageNumber}
                  scale={scale}
                  onLoaded={setPageCount}
                  onError={() => setRenderFailed(true)}
                />
              )}
              {isImage && (
                // eslint-disable-next-line @next/next/no-img-element -- external R2 host, zoom via CSS transform
                <img
                  src={url}
                  alt={doc.caption ?? doc.title}
                  style={{ transform: `scale(${scale})` }}
                  className="max-h-full max-w-full object-contain transition-transform"
                />
              )}
              {isAudio && (
                <audio controls src={url} className="w-full max-w-[480px]">
                  Браузер не поддерживает воспроизведение аудио.
                </audio>
              )}
              {isVideo && (
                <video controls src={url} className="max-h-[70vh] max-w-full">
                  Браузер не поддерживает воспроизведение видео.
                </video>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-(--h-muted)">
              <Icon className="h-16 w-16" aria-hidden="true" />
              <p className="text-lg">
                {hasPreview && renderFailed
                  ? "Не удалось загрузить предпросмотр."
                  : "Предпросмотр недоступен для этого типа файла."}
              </p>
              <p className="text-base">Скачайте файл, чтобы открыть его.</p>
            </div>
          )}

          {canZoom && !renderFailed && (
            <div className="absolute top-3 right-3 flex gap-1.5">
              <button
                type="button"
                onClick={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
                disabled={scale <= MIN_SCALE}
                aria-label="Уменьшить"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-(--h-gold-200) bg-(--h-paper-light) text-(--h-forest-800) shadow-(--h-shadow-card) disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZoomOut className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
                disabled={scale >= MAX_SCALE}
                aria-label="Увеличить"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-(--h-gold-200) bg-(--h-paper-light) text-(--h-forest-800) shadow-(--h-shadow-card) disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "На весь экран"}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-(--h-gold-200) bg-(--h-paper-light) text-(--h-forest-800) shadow-(--h-shadow-card)"
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Maximize className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
            disabled={pageNumber <= 1}
            aria-label="Предыдущая страница"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-(--h-gold-200) text-(--h-forest-800) disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="text-lg text-(--h-ink)">
            Страница {pageNumber} из {pageCount}
          </p>
          <button
            type="button"
            onClick={() => setPageNumber((value) => Math.min(pageCount, value + 1))}
            disabled={pageNumber >= pageCount}
            aria-label="Следующая страница"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-(--h-gold-200) text-(--h-forest-800) disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div>
          <div role="tablist" aria-label="Сведения о документе" className="flex border-b border-(--h-gold-200)">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "-mb-px cursor-pointer border-b-2 px-5 py-3 text-lg",
                  activeTab === tab.key
                    ? "border-(--h-forest-800) text-(--h-forest-800)"
                    : "border-transparent text-(--h-muted) hover:text-(--h-ink)",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="flex flex-col gap-5 pt-5">
            {activeTab === "description" && (
              <p className="text-lg text-(--h-ink)">{doc.caption ?? "Описание пока не добавлено."}</p>
            )}
            {activeTab === "transcript" && (
              <p className="whitespace-pre-line text-lg text-(--h-ink)">
                {doc.transcript ?? "Расшифровка пока не добавлена."}
              </p>
            )}
            {activeTab === "source" && (
              <p className="text-lg text-(--h-ink)">
                {doc.sourceOrOwner ?? "Источник не указан."}
              </p>
            )}

            {doc.linkedPersonIds.length > 0 && (
              <div>
                <p className="font-heading text-xl text-(--h-forest-800)">Связанные родственники</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {doc.linkedPersonIds.map((personId, index) => (
                    <Link
                      key={personId}
                      href={`/people/${personId}`}
                      className="rounded-[var(--h-radius-chip)] border border-(--h-gold-200) bg-(--h-paper-light) px-3 py-1.5 text-lg text-(--h-forest-800) hover:bg-(--h-white-warm)"
                    >
                      {doc.linkedPersonNames[index]}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {url && (
          <a
            href={url}
            download={doc.originalFilename}
            title={`${doc.originalFilename} · ${formatFileSize(doc.sizeBytes)}`}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--h-radius-control)] bg-(--h-forest-800) text-lg font-medium text-(--h-white-warm) hover:bg-(--h-forest-hover)"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Скачать документ
          </a>
        )}
      </div>
    </div>
  );
}
