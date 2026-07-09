import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, "../.."),
  transpilePackages: ["@karigo/config", "@karigo/shared-types"]
};

export default nextConfig;
