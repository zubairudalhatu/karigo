import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(__dirname, "../.."),
  transpilePackages: ["@karigo/config", "@karigo/ui-components"]
};

export default nextConfig;
