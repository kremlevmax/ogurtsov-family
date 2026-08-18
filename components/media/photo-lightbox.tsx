"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getMediaPublicUrl } from "@/lib/r2/public-url";
import { cn } from "@/lib/utils/cn";

export interface LightboxPhoto {
  id: string;
  objectKey: string;
  title: string;
  caption: string | null;
}

export interface PhotoLightboxProps<T extends LightboxPhoto> {
  photos: T[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Extra content under the caption — e.g. links to the people a shared gallery photo belongs to. */
  footer?: (photo: T) => ReactNode;
}

/** Full-screen photo viewer, click-to-zoom to actual size (CLAUDE.md 3.7 gallery). Shared by the person-card gallery and the site-wide gallery. */
export function PhotoLightbox<T extends LightboxPhoto>({
  photos,
  index,
  onClose,
  onIndexChange,
  footer,
}: PhotoLightboxProps<T>) {
  const photo = photos[index];
  const url = getMediaPublicUrl(photo.objectKey);
  const [isZoomed, setIsZoomed] = useState(false);
  // Reset zoom when the photo changes — adjusted during render (React's
  // documented pattern for this) rather than an effect, so it can't
  // flash the previous photo at full size for one frame first.
  const [zoomResetForIndex, setZoomResetForIndex] = useState(index);
  if (zoomResetForIndex !== index) {
    setZoomResetForIndex(index);
    setIsZoomed(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndexChange((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onIndexChange((index - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, photos.length, onClose, onIndexChange]);

  if (typeof document === "undefined" || !url) return null;

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex flex-col bg-black/90 p-4">
      <div className="flex items-center justify-between text-white">
        <p className="text-sm">{photo.title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть просмотр"
          className="rounded-full p-1.5 hover:bg-white/10"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className={cn(
          "relative flex min-h-0 flex-1",
          isZoomed ? "items-start justify-start overflow-auto" : "items-center justify-center",
        )}
      >
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)}
            aria-label="Предыдущее фото"
            className="fixed left-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={photo.caption ?? photo.title}
          onClick={() => setIsZoomed((zoomed) => !zoomed)}
          title={isZoomed ? "Уменьшить" : "Увеличить до полного размера"}
          className={cn(
            "m-auto",
            isZoomed ? "max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain",
          )}
        />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => onIndexChange((index + 1) % photos.length)}
            aria-label="Следующее фото"
            className="fixed right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-white hover:bg-white/10"
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
          </button>
        )}
      </div>

      {photo.caption && <p className="pt-2 text-center text-sm text-white/70">{photo.caption}</p>}
      {footer && <div className="pt-2 text-center text-sm text-white/70">{footer(photo)}</div>}
    </div>,
    document.body,
  );
}
