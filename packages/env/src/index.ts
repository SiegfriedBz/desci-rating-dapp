import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Free-tier Gemini Flash Lite default used across agents / publication quads. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/** Default HTTP gateway for CID retrieval (Pinata public gateway). */
export const DEFAULT_IPFS_GATEWAY_URL = "https://gateway.pinata.cloud/ipfs";

/** Local GROBID Docker default (`pnpm grobid:up`). */
export const DEFAULT_GROBID_URL = "http://127.0.0.1:8070";

export const DEFAULT_GROBID_TIMEOUT_MS = 120_000;

/** Fallback DKG daemon HTTP port when ~/.dkg/api.port is missing. */
export const DEFAULT_DKG_API_PORT = "9200";

/** Soft default context graph for CLI samples when env is unset. */
export const DEFAULT_DKG_CONTEXT_GRAPH_ID = "verisci";

export const DEFAULT_INNGEST_DEV_API_BASE_URL = "http://localhost:8288";

export const DEFAULT_INNGEST_CLOUD_API_BASE_URL = "https://api.inngest.com";

/**
 * Server env catalog — secrets and server-only config.
 * For `NEXT_PUBLIC_*` use `@desci/env/client` instead (do not duplicate here).
 */
export const env = createEnv({
  server: {
    // DKG daemon / scripts
    DKG_API_URL: z.string().optional(),
    DKG_API_PORT: z.string().optional(),
    DKG_AUTH_TOKEN: z.string().optional(),
    DKG_HOME: z.string().optional(),
    DKG_CONTEXT_GRAPH_ID: z.string().optional(),
    DKG_KA_NAME: z.string().optional(),
    DKG_UAL: z.string().optional(),
    DKG_SUBJECT_URI: z.string().optional(),
    DKG_PDF_PATH: z.string().optional(),

    // GROBID
    GROBID_URL: z.string().optional(),
    GROBID_TIMEOUT_MS: z.coerce.number().positive().optional(),

    // Pinata pins PDFs; IPFS_GATEWAY_URL overrides the default Pinata gateway.
    PINATA_JWT: z.string().optional(),
    IPFS_GATEWAY_URL: z.string().url().optional(),

    // Contracts / EVM (TS side; Foundry still reads PRIVATE_KEY / ORACLE_AGENT itself)
    BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
    PRIVATE_KEY: z.string().optional(),
    ORACLE_AGENT: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, "expected 0x-prefixed address")
      .optional(),
    ORACLE_AGENT_PRIVATE_KEY: z.string().optional(),
    ETHERSCAN_API_KEY: z.string().optional(),

    // Alchemy webhook
    ALCHEMY_BASE_SEPOLIA_WH_SK: z.string().optional(),

    // Gemini
    GOOGLE_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().optional(),

    // Inngest
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    /** Override Inngest REST API base (dev server or cloud). */
    INNGEST_API_BASE_URL: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
});

/** Prefer GOOGLE_API_KEY; fall back to GEMINI_API_KEY alias. */
export const geminiApiKey: string | undefined =
  env.GOOGLE_API_KEY ?? env.GEMINI_API_KEY;

/** Resolved Gemini model (env override or free-tier default). */
export const geminiModel: string = env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;

/** Resolved IPFS HTTP gateway base (env override or Pinata public gateway). */
export const ipfsGatewayUrl: string =
  env.IPFS_GATEWAY_URL ?? DEFAULT_IPFS_GATEWAY_URL;

/** Resolved GROBID base URL (no trailing slash). */
export const grobidUrl: string = (
  env.GROBID_URL ?? DEFAULT_GROBID_URL
).replace(/\/$/, "");

/** Resolved GROBID request timeout in ms. */
export const grobidTimeoutMs: number =
  env.GROBID_TIMEOUT_MS ?? DEFAULT_GROBID_TIMEOUT_MS;

/** Resolved default DKG API port when no port file / DKG_API_URL is present. */
export const dkgApiPort: string = env.DKG_API_PORT ?? DEFAULT_DKG_API_PORT;

/**
 * Soft CLI default for context graph id. Production paths should use
 * {@link requireDkgContextGraphId} instead.
 */
export const dkgContextGraphIdOrDefault: string =
  env.DKG_CONTEXT_GRAPH_ID ?? DEFAULT_DKG_CONTEXT_GRAPH_ID;

/**
 * Inngest REST API base for event run polling.
 * Override with `INNGEST_API_BASE_URL`; otherwise cloud in production, local
 * Dev Server otherwise.
 */
export const inngestApiBaseUrl: string = (
  env.INNGEST_API_BASE_URL ??
  (process.env.NODE_ENV === "production"
    ? DEFAULT_INNGEST_CLOUD_API_BASE_URL
    : DEFAULT_INNGEST_DEV_API_BASE_URL)
).replace(/\/$/, "");

/**
 * Throw when a feature-specific env value is missing at use time.
 * Prefer this over required Zod schemas so unused entrypoints can import `env`.
 * Use only for secrets / required IDs that have no default.
 */
export function requireEnv<T>(
  value: T | undefined,
  message: string
): NonNullable<T> {
  if (value === undefined || value === null || value === "") {
    throw new Error(message);
  }
  return value as NonNullable<T>;
}

/** Require `DKG_CONTEXT_GRAPH_ID` for production DKG read/write paths. */
export function requireDkgContextGraphId(purpose: string): string {
  return requireEnv(
    env.DKG_CONTEXT_GRAPH_ID,
    `DKG_CONTEXT_GRAPH_ID is required for ${purpose}`
  );
}
