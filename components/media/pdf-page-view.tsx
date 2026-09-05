"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

export interface PdfPageViewProps {
  url: string;
  pageNumber: number;
  scale: number;
  onLoaded?: (pageCount: number) => void;
  onError?: () => void;
}

/**
 * Renders one page of a PDF to a `<canvas>` via pdf.js — dynamically
 * imported so the library only loads once a visitor actually opens a
 * PDF document, never as part of the main app bundle.
 */
export function PdfPageView({ url, pageNumber, scale, onLoaded, onError }: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);

  // Reset the doc when `url` changes — adjusted during render (React's
  // documented pattern, same as PhotoLightbox's zoom reset) rather than
  // an effect, so the old document is never rendered under a new URL.
  const [docLoadedForUrl, setDocLoadedForUrl] = useState(url);
  if (docLoadedForUrl !== url) {
    setDocLoadedForUrl(url);
    setDoc(null);
  }

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        loadingTask = pdfjs.getDocument({ url });
        const loaded = await loadingTask.promise;
        if (cancelled) return;
        setDoc(loaded);
        onLoaded?.(loaded.numPages);
      } catch {
        if (!cancelled) onError?.();
      }
    })();
    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onLoaded/onError intentionally excluded, only `url` should reload the document
  }, [url]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
      } catch {
        if (!cancelled) onError?.();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onError intentionally excluded
  }, [doc, pageNumber, scale]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas ref={canvasRef} aria-label="Страница документа" />
      {!doc && (
        <p className="absolute text-lg text-(--h-muted)" role="status">
          Загрузка документа…
        </p>
      )}
    </div>
  );
}
