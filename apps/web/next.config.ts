import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@portfolio/content", "@portfolio/ui"],
};

export default nextConfig;
