import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Show artwork and host photos come from each podcast's own host, so the
       optimizer accepts any origin; it resizes the large originals and lets
       the few http-only feeds render on the https page without mixed content. */
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    minimumCacheTTL: 86400,
  },
};

export default nextConfig;
