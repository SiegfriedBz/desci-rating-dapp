import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** Free-tier Gemini Flash Lite default used across agents / publication quads. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

/**
 * Typed catalog of repo-root env vars. Keys are optional (or defaulted) so
 * importing this package never fails when only a subset of secrets is set —
 * callers use `requireEnv` at the feature boundary.
 */
export const env = createEnv({
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    /** Reown Cloud project id for AppKit (optional — UI degrades without it). */
    NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1).optional(),
    /** Footer portfolio URL (optional — link omitted when unset). */
    NEXT_PUBLIC_CONTACT_PORTFOLIO_URL: z.string().url().optional(),
    /** Footer LinkedIn URL (optional — link omitted when unset). */
    NEXT_PUBLIC_CONTACT_LINKEDIN_URL: z.string().url().optional(),
  },
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

    // Pinata / IPFS (Pinata is pin-only; IPFS_GATEWAY_URL for retrieval)
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

/**
 * Throw when a feature-specific env value is missing at use time.
 * Prefer this over required Zod schemas so unused entrypoints can import `env`.
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
