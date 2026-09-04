import type { NextConfig } from "next";
import { getSecurityHeaders } from "./lib/security/headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
    ];
  },
  async redirects() {
    return [
      // The audio player moved onto /story itself (owner's request,
      // 2026-09-04: one page for the text and the read-aloud version,
      // player on top) — this keeps any bookmarked/indexed /audio link
      // working.
      { source: "/audio", destination: "/story#audio", permanent: true },
      // Editor and lounge-member sign-in merged into one /login and
      // /register (owner's request, 2026-09-04) — query strings like
      // ?next=... pass through automatically since destination doesn't
      // redeclare them.
      { source: "/lounge/login", destination: "/login", permanent: true },
      { source: "/lounge/register", destination: "/register", permanent: true },
    ];
  },
};

export default nextConfig;
