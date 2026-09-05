import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Next only auto-loads env files from `apps/web/`. Merge the monorepo root
 * `.env` into `process.env` so shared server secrets work without duplicating
 * into `apps/web/.env.local`. Existing process env wins (no overwrite).
 */
function loadMonorepoRootEnv(): void {
  const monorepoRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
  );
  const envPath = path.join(monorepoRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadMonorepoRootEnv();

const nextConfig: NextConfig = {
  transpilePackages: [
    "@desci/shared",
    "@desci/env",
    "@desci/dkg-client",
    "@desci/agents",
    "@desci/contracts",
  ],
  // AppKit / wagmi optional Node deps (Reown Next.js skill + Coinbase x402 peers).
  serverExternalPackages: [
    "pino-pretty",
    "lokijs",
    "encoding",
    "@coinbase/cdp-sdk",
  ],
  // Next 16 defaults to Turbopack; keep webpack externals for `next build --webpack`.
  turbopack: {},
  webpack: (config) => {
    config.externals.push(
      "pino-pretty",
      "lokijs",
      "encoding",
      "@coinbase/cdp-sdk"
    );
    return config;
  },
};

export default nextConfig;
