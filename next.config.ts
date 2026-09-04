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
  // The audio player moved onto /story itself (owner's request, 2026-09-04:
  // one page for the text and the read-aloud version, player on top) —
  // this keeps any bookmarked/indexed /audio link working.
  async redirects() {
    return [{ source: "/audio", destination: "/story#audio", permanent: true }];
  },
};

export default nextConfig;
