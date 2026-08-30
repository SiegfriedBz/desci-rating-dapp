import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@desci/shared",
    "@desci/dkg-client",
    "@desci/agents"
  ],
};

export default nextConfig;