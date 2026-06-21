import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Fix Turbopack multi-lockfile workspace root detection.
  // Without this, Next.js picks the parent repo root (user app) instead of
  // this south-admin directory, causing @/* import alias resolution to fail.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;