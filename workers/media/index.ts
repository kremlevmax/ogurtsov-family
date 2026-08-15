/**
 * Public media endpoint (CLAUDE.md 5.4). Reads directly from the R2
 * bucket via a native binding — no S3 API calls, no Next.js server
 * involved. Deployed separately from the main app (`wrangler deploy`
 * from this directory).
 *
 * Object keys are UUID-based (never the original filename) — the
 * original name only ever appears in the `Content-Disposition` header,
 * sourced from R2 custom metadata set at upload finalize time.
 */

export interface Env {
  MEDIA_BUCKET: R2Bucket;
}

// A year, immutable: object keys are UUIDs and never reused for different content.
const CACHE_CONTROL = "public, max-age=31536000, immutable";

const mediaWorker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Метод не поддерживается", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    const objectKey = decodeObjectKey(url.pathname);
    if (!objectKey) {
      return new Response("Не найдено", { status: 404 });
    }

    const rangeHeader = request.headers.get("range");

    if (request.method === "HEAD") {
      const object = await env.MEDIA_BUCKET.head(objectKey);
      if (!object) return new Response("Не найдено", { status: 404 });
      return new Response(null, { status: 200, headers: buildHeaders(object, null) });
    }

    const object = await env.MEDIA_BUCKET.get(objectKey, {
      range: rangeHeader ? parseRangeHeader(rangeHeader) : undefined,
      onlyIf: request.headers,
    });

    if (!object) {
      return new Response("Не найдено", { status: 404 });
    }

    if (!("body" in object) || !object.body) {
      // Conditional request matched (304) — R2Object without a body.
      return new Response(null, { status: 304, headers: buildHeaders(object, null) });
    }

    const isPartial = "range" in object && object.range !== undefined;
    return new Response(object.body, {
      status: isPartial ? 206 : 200,
      headers: buildHeaders(object, isPartial ? object.range : null),
    });
  },
};

export default mediaWorker;

function decodeObjectKey(pathname: string): string | null {
  const raw = pathname.replace(/^\/+/, "");
  if (!raw || raw.includes("..")) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function buildHeaders(
  object: R2Object,
  range: { offset: number; length: number } | { suffix: number } | undefined | null,
): Headers {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", CACHE_CONTROL);
  headers.set("accept-ranges", "bytes");
  headers.set("x-content-type-options", "nosniff");

  const contentType = headers.get("content-type");
  const disposition = isInlineType(contentType) ? "inline" : "attachment";
  const originalFilename = object.customMetadata?.originalFilename;
  headers.set(
    "content-disposition",
    originalFilename ? `${disposition}; ${formatFilenameForHeader(originalFilename)}` : disposition,
  );

  if (range && "offset" in range && object.size) {
    headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
  }

  return headers;
}

/** Inline only for browser-displayable images; TIFF scans and everything else always download (CLAUDE.md 3.8). */
function isInlineType(contentType: string | null): boolean {
  return !!contentType && contentType.startsWith("image/") && contentType !== "image/tiff";
}

/** ASCII fallback plus RFC 5987 filename* so non-Latin names still display correctly. */
function formatFilenameForHeader(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function parseRangeHeader(header: string): R2Range | undefined {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header);
  if (!match) return undefined;
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  return end !== undefined ? { offset, length: end - offset + 1 } : { offset };
}
