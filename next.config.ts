import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produces a self-contained `.next/standalone/` directory
  // with only the deps the server actually imports — typically <50MB —
  // so the runtime Docker image stays small.
  output: "standalone",
};

export default nextConfig;
