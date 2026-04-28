import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

function normalizeDevOrigin(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function readAllowedDevOrigins() {
  const origins = new Set(["127.0.0.1", "localhost"]);
  const configuredOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map(normalizeDevOrigin)
    .filter(Boolean);

  for (const origin of configuredOrigins) {
    origins.add(origin);
  }

  for (const interfaceEntries of Object.values(networkInterfaces())) {
    for (const entry of interfaceEntries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        origins.add(entry.address);
      }
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: process.env.NODE_ENV === "development" ? readAllowedDevOrigins() : undefined
};

export default nextConfig;
