/**
 * Builds the public download/view URL for an object key, served by the
 * Cloudflare Worker (`workers/media`) — never the R2 bucket directly.
 * Safe to import from client components: only reads a NEXT_PUBLIC_ var.
 */
export function getMediaPublicUrl(objectKey: string): string | null {
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/${objectKey}`;
}
