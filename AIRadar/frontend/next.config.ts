import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://j14b104a.p.ssafy.io:8888/:path*',
      },
    ];
  },
};

export default nextConfig;
