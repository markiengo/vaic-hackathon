import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.PLAYWRIGHT_TEST === "1" ? undefined : "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.0.154"],
};

export default nextConfig;
