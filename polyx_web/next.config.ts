import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://51.210.15.18:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
