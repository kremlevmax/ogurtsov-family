/** Client-only helpers shared by every direct-to-R2 upload flow (components/forms/media-upload.tsx, components/lounge/family-lounge.tsx). */

/** Mirrors the server-side allowlist (lib/validation/media.ts) — a client-side hint only, never trusted alone (CLAUDE.md 3.8). */
export const UPLOAD_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.avif,.gif,.tif,.tiff,.pdf,.txt,.rtf,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.mp3,.m4a,.aac,.wav,.flac,.ogg,.mp4,.mov,.m4v,.webm,.zip,.7z,.tar,.gz";

/** Photo/document-only subsets, for the member-facing person media upload (components/forms/person-media-upload.tsx) — matches lib/validation/media.ts's "photo"/"document" kind extensions. */
export const PHOTO_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,.avif,.gif";
export const DOCUMENT_UPLOAD_ACCEPT = ".tif,.tiff,.pdf,.txt,.rtf,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp";

export function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/** Direct-to-R2 PUT with upload progress — `fetch` can't report progress, so this uses XHR (CLAUDE.md 10: upload progress is a required UI state). */
export function uploadWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Загрузка не удалась (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Загрузка не удалась. Проверьте соединение."));
    xhr.send(file);
  });
}
