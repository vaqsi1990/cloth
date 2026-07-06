import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Allow higher quality values used by next/image (default list is [75] only)
    qualities: [75, 85, 90, 95, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**", 
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Compress output for better performance
  compress: true,
  async headers() {
    return [
      {
        // Avoid stale HTML on mobile Safari after deploys (iPhone cache)
        source: "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
