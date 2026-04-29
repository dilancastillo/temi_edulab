import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["*"],
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;