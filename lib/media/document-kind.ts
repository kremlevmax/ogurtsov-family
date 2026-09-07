/**
 * True for the document kinds that are plain images (scans, incl. a
 * JPG/PNG document uploaded with "это скан" checked) — these can
 * preview with the original file itself as an `<img>`; everything else
 * (PDF/DOCX/XLS/…) falls back to a thumbnail or an icon tile instead.
 */
export function isImageLikeDocument(extension: string): boolean {
  return ["tif", "tiff", "jpg", "jpeg", "png", "webp", "avif", "gif"].includes(extension);
}
