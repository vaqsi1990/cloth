import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**", 
      },
    ],
  },
  // Compress output for better performance
  compress: true,
};

export default nextConfig;
