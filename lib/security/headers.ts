/**
 * Baseline security headers (CLAUDE.md 13). Kept intentionally strict;
 * `connect-src`/`img-src` are widened only with the exact configured
 * R2/media-worker hosts, never a wildcard.
 *
 * `'unsafe-eval'` is added to `script-src` only in development — React's
 * dev-mode debugging tools (stack reconstruction, Turbopack HMR) call
 * `eval()`; React never uses it in production, so prod stays strict.
 */

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildContentSecurityPolicy(): string {
  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

  // The browser PUTs uploads directly to R2 (CLAUDE.md 5.4). The AWS SDK
  // presigns virtual-hosted-style URLs (`<bucket>.<account>.r2.cloudflarestorage.com`),
  // so both the bare account host and its bucket subdomains must be allowed —
  // still scoped to only our own account, never a bare `r2.cloudflarestorage.com` wildcard.
  const r2Origins = process.env.R2_ACCOUNT_ID
    ? [
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        `https://*.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      ]
    : [];
  // Photos render inline from the public media worker; without a
  // `media-src` entry too, `<audio>` inherits `default-src 'self'` and
  // Chrome silently refuses the cross-origin source before even
  // requesting it ("Media load rejected by URL safety check" — real
  // bug report, the /story page's audio player never loaded).
  const mediaOrigin = originOf(process.env.NEXT_PUBLIC_MEDIA_BASE_URL);

  const imgSrc = ["img-src", "'self'", "data:", "blob:", mediaOrigin].filter(Boolean).join(" ");
  const mediaSrc = ["media-src", "'self'", mediaOrigin].filter(Boolean).join(" ");
  const connectSrc = ["connect-src", "'self'", ...r2Origins].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    imgSrc,
    mediaSrc,
    "font-src 'self' data:",
    connectSrc,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function getSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ];
}
