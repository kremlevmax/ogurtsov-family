import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE_BYTES, validateFileMetadata, verifyMagicBytes } from "@/lib/validation/media";

describe("validateFileMetadata", () => {
  it("accepts a JPEG under the size limit", () => {
    const result = validateFileMetadata("photo.jpg", "image/jpeg", 1024);
    expect(result).toEqual({ ok: true, kind: "photo", extension: "jpg" });
  });

  it("rejects a file over 100 MiB", () => {
    const result = validateFileMetadata("video.mp4", "video/mp4", MAX_FILE_SIZE_BYTES + 1);
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the 100 MiB limit", () => {
    const result = validateFileMetadata("archive.zip", "application/zip", MAX_FILE_SIZE_BYTES);
    expect(result.ok).toBe(true);
  });

  it("rejects a zero-byte file", () => {
    const result = validateFileMetadata("empty.txt", "text/plain", 0);
    expect(result.ok).toBe(false);
  });

  it("rejects disallowed extensions like .exe", () => {
    const result = validateFileMetadata("app.exe", "application/x-msdownload", 1024);
    expect(result.ok).toBe(false);
  });

  it("rejects HTML and SVG outright", () => {
    expect(validateFileMetadata("page.html", "text/html", 1024).ok).toBe(false);
    expect(validateFileMetadata("icon.svg", "image/svg+xml", 1024).ok).toBe(false);
  });

  it("rejects a double-extension trick like photo.jpg.exe", () => {
    const result = validateFileMetadata("photo.jpg.exe", "image/jpeg", 1024);
    expect(result.ok).toBe(false);
  });

  it("rejects a MIME type that doesn't match the extension", () => {
    const result = validateFileMetadata("document.pdf", "image/jpeg", 1024);
    expect(result.ok).toBe(false);
  });

  it("classifies office/OpenDocument formats as documents", () => {
    expect(
      validateFileMetadata(
        "report.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        1024,
      ).kind,
    ).toBe("document");
  });

  it("classifies TIFF scans as documents (download-only, never inline)", () => {
    expect(validateFileMetadata("scan.tiff", "image/tiff", 1024).kind).toBe("document");
  });
});

describe("verifyMagicBytes", () => {
  it("passes a genuine PNG signature", () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(verifyMagicBytes("png", pngHeader)).toBe(true);
  });

  it("fails when the bytes don't match the claimed extension", () => {
    const notAPng = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    expect(verifyMagicBytes("png", notAPng)).toBe(false);
  });

  it("passes through extensions with no known signature (e.g. txt)", () => {
    const anyBytes = new Uint8Array([1, 2, 3, 4]);
    expect(verifyMagicBytes("txt", anyBytes)).toBe(true);
  });
});
