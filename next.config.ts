import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Only active in production builds; disabled in dev/Turbopack mode
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Empty turbopack config silences "webpack config but no turbopack config" error
  turbopack: {},
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default withSerwist(nextConfig);
