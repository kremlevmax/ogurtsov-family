import type { MediaKind } from "@/lib/supabase/types";

/** 100 MiB, matching the `media.size_bytes` check constraint (CLAUDE.md 3.7). */
export const MAX_FILE_SIZE_BYTES = 104_857_600;

interface AllowedType {
  kind: MediaKind;
  mimeTypes: string[];
}

/**
 * Safe allowlist by extension (CLAUDE.md 3.8). Executable and active
 * web formats are never in this table, so any extension not listed
 * here is rejected by default — nothing needs an explicit deny entry.
 */
export const ALLOWED_FILE_TYPES: Record<string, AllowedType> = {
  jpg: { kind: "photo", mimeTypes: ["image/jpeg"] },
  jpeg: { kind: "photo", mimeTypes: ["image/jpeg"] },
  png: { kind: "photo", mimeTypes: ["image/png"] },
  webp: { kind: "photo", mimeTypes: ["image/webp"] },
  avif: { kind: "photo", mimeTypes: ["image/avif"] },
  gif: { kind: "photo", mimeTypes: ["image/gif"] },

  // Scans — download-only, never rendered inline (CLAUDE.md 3.8).
  tif: { kind: "document", mimeTypes: ["image/tiff"] },
  tiff: { kind: "document", mimeTypes: ["image/tiff"] },

  pdf: { kind: "document", mimeTypes: ["application/pdf"] },
  txt: { kind: "document", mimeTypes: ["text/plain"] },
  rtf: { kind: "document", mimeTypes: ["application/rtf", "text/rtf"] },
  csv: { kind: "document", mimeTypes: ["text/csv"] },

  doc: { kind: "document", mimeTypes: ["application/msword"] },
  docx: {
    kind: "document",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  xls: { kind: "document", mimeTypes: ["application/vnd.ms-excel"] },
  xlsx: {
    kind: "document",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  },
  ppt: { kind: "document", mimeTypes: ["application/vnd.ms-powerpoint"] },
  pptx: {
    kind: "document",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  },
  odt: { kind: "document", mimeTypes: ["application/vnd.oasis.opendocument.text"] },
  ods: { kind: "document", mimeTypes: ["application/vnd.oasis.opendocument.spreadsheet"] },
  odp: { kind: "document", mimeTypes: ["application/vnd.oasis.opendocument.presentation"] },

  mp3: { kind: "audio", mimeTypes: ["audio/mpeg"] },
  m4a: { kind: "audio", mimeTypes: ["audio/mp4", "audio/x-m4a"] },
  aac: { kind: "audio", mimeTypes: ["audio/aac"] },
  wav: { kind: "audio", mimeTypes: ["audio/wav", "audio/x-wav", "audio/vnd.wave"] },
  flac: { kind: "audio", mimeTypes: ["audio/flac", "audio/x-flac"] },
  ogg: { kind: "audio", mimeTypes: ["audio/ogg"] },

  mp4: { kind: "video", mimeTypes: ["video/mp4"] },
  mov: { kind: "video", mimeTypes: ["video/quicktime"] },
  m4v: { kind: "video", mimeTypes: ["video/x-m4v", "video/mp4"] },
  webm: { kind: "video", mimeTypes: ["video/webm"] },

  zip: { kind: "archive", mimeTypes: ["application/zip", "application/x-zip-compressed"] },
  "7z": { kind: "archive", mimeTypes: ["application/x-7z-compressed"] },
  tar: { kind: "archive", mimeTypes: ["application/x-tar"] },
  gz: { kind: "archive", mimeTypes: ["application/gzip", "application/x-gzip"] },
};

/** Explicitly dangerous — checked against every dot-segment, not just the last, to catch "photo.jpg.exe" tricks. */
const DANGEROUS_EXTENSIONS = new Set([
  "html",
  "htm",
  "svg",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "exe",
  "msi",
  "dll",
  "app",
  "dmg",
  "pkg",
  "bat",
  "cmd",
  "ps1",
  "sh",
  "zsh",
  "jar",
]);

export interface FileMetadataValidation {
  ok: boolean;
  error?: string;
  kind?: MediaKind;
  extension?: string;
}

export interface ValidateFileMetadataOptions {
  /**
   * A plain image file (jpg/png/webp/avif/gif — tif/tiff is already a
   * "document" scan) can't be told apart from a real photo by extension
   * alone: a scanned certificate saved as .jpg looks identical to a
   * portrait. This lets the uploader say "this one's a document scan,
   * not a photo of a person" — the only thing it changes is which kind
   * the file is stored/listed under (still fully re-validated against
   * the real bytes at finalize time, same as every other kind).
   */
  treatImageAsDocument?: boolean;
}

/**
 * Validates a file's declared name/MIME/size before issuing a presigned
 * upload URL. Checks extension against the allowlist, cross-checks the
 * claimed MIME type against that extension, rejects known-dangerous
 * extensions anywhere in the filename, and enforces the size cap.
 * Never trust this alone — `verifyMagicBytes` re-checks the real bytes
 * at finalize time, once the file is actually in R2 (CLAUDE.md 3.8:
 * "не полагайся только на клиентскую проверку").
 */
export function validateFileMetadata(
  originalFilename: string,
  mimeType: string,
  sizeBytes: number,
  options?: ValidateFileMetadataOptions,
): FileMetadataValidation {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0 || sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: "Файл должен быть больше 0 и не более 100 МБ." };
  }

  const segments = originalFilename.toLowerCase().split(".");
  if (segments.length < 2) {
    return { ok: false, error: "Не удалось определить тип файла по имени." };
  }

  for (const segment of segments.slice(1)) {
    if (DANGEROUS_EXTENSIONS.has(segment)) {
      return { ok: false, error: "Этот тип файла запрещён." };
    }
  }

  const extension = segments[segments.length - 1];
  const allowed = ALLOWED_FILE_TYPES[extension];
  if (!allowed) {
    return { ok: false, error: "Этот тип файла не поддерживается." };
  }

  if (!allowed.mimeTypes.includes(mimeType.toLowerCase())) {
    return { ok: false, error: "Заявленный тип файла не соответствует расширению." };
  }

  const kind = options?.treatImageAsDocument && allowed.kind === "photo" ? "document" : allowed.kind;
  return { ok: true, kind, extension };
}

type MagicByteSignature = { bytes: number[]; offset?: number };

/**
 * Known byte signatures for the extensions where spoofing is the most
 * realistic risk (images, PDFs, and the many Office/OpenDocument
 * formats that are all ZIP containers under the hood). Extensions
 * without an entry here (txt, csv, tar, most audio codecs, ...) skip
 * this check — "когда это практически возможно" (CLAUDE.md 3.8), not
 * "for every format no matter the cost".
 */
const MAGIC_BYTES: Record<string, MagicByteSignature[]> = {
  jpg: [{ bytes: [0xff, 0xd8, 0xff] }],
  jpeg: [{ bytes: [0xff, 0xd8, 0xff] }],
  png: [{ bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  gif: [{ bytes: [0x47, 0x49, 0x46, 0x38] }],
  webp: [{ bytes: [0x52, 0x49, 0x46, 0x46] }],
  pdf: [{ bytes: [0x25, 0x50, 0x44, 0x46] }],
  zip: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }, { bytes: [0x50, 0x4b, 0x05, 0x06] }],
  docx: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  xlsx: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  pptx: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  odt: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  ods: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  odp: [{ bytes: [0x50, 0x4b, 0x03, 0x04] }],
  mp3: [{ bytes: [0x49, 0x44, 0x33] }, { bytes: [0xff, 0xfb] }, { bytes: [0xff, 0xf3] }],
};

/** True if `head` doesn't have a known signature for `extension`, or matches one. */
export function verifyMagicBytes(extension: string, head: Uint8Array): boolean {
  const signatures = MAGIC_BYTES[extension];
  if (!signatures) return true;

  return signatures.some(({ bytes, offset = 0 }) =>
    bytes.every((byte, index) => head[offset + index] === byte),
  );
}
