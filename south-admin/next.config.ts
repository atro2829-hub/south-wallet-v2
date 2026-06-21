import type { NextConfig } from "next";
  import path from "path";

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
    // Fix: Turbopack incorrectly picks the parent (user app) as workspace root.
    // Solution: explicitly set turbopack.root + resolveAlias to force correct @/src mapping.
    turbopack: {
      root: path.resolve(__dirname),
      resolveAlias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };

  export default nextConfig;
  