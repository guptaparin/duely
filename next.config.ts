import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stray lockfiles in parent folders make Next guess the wrong workspace root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
