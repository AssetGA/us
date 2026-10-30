import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    const base = apiProxyTarget.replace(/\/$/, "");
    return [
      { source: "/api/v1/:path*", destination: `${base}/api/v1/:path*` },
      { source: "/uploads/:path*", destination: `${base}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
