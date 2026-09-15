import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** A URL with any trailing slash trimmed, so callers can append paths. */
const baseUrl = () =>
  z
    .string()
    .url()
    .transform((value) => value.replace(/\/+$/, ""));

/**
 * Server env. Required by default — a missing value throws on first import
 * rather than failing later at the call site. Only variables with a real
 * fallback are `.optional()`, and each says what the fallback is.
 */
export const env = createEnv({
  server: {
    // ── DKG ────────────────────────────────────────────────────────────
    /** Context graph the catalog reads and the workers write to. */
    DKG_CONTEXT_GRAPH_ID: z.string().min(1),
    /** Daemon endpoint. Omit locally to resolve from `~/.dkg/api.port`. */
    DKG_API_URL: baseUrl().optional(),
    /** Bearer token. Omit locally to read `~/.dkg/auth.token`. */
    DKG_AUTH_TOKEN: z.string().min(1).optional(),
    /** Overrides the `~/.dkg` directory. */
    DKG_HOME: z.string().min(1).optional(),
    DKG_API_PORT: z.string().default("9200"),

    // Arguments for the `pnpm dkg:*` scripts; each also accepts argv.
    DKG_KA_NAME: z.string().min(1).optional(),
    DKG_UAL: z.string().min(1).optional(),
    DKG_SUBJECT_URI: z.string().min(1).optional(),
    DKG_PDF_PATH: z.string().min(1).optional(),

    // ── GROBID ─────────────────────────────────────────────────────────
    GROBID_URL: baseUrl().default("http://127.0.0.1:8070"),
    GROBID_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

    // ── IPFS ───────────────────────────────────────────────────────────
    PINATA_JWT: z.string().min(1),
    IPFS_GATEWAY_URL: baseUrl().default("https://gateway.pinata.cloud/ipfs"),

    // ── Base Sepolia ───────────────────────────────────────────────────
    BASE_SEPOLIA_RPC_URL: z.string().url(),
    /** Signer for `fulfillPhase1`; must match on-chain `oracleAgent()`. */
    ORACLE_AGENT_PRIVATE_KEY: z
      .string()
      .regex(/^(0x)?[0-9a-fA-F]{64}$/, "expected a 32-byte hex private key")
      .transform((key) =>
        key.startsWith("0x") ? (key as `0x${string}`) : (`0x${key}` as const)
      ),
    /** HMAC secret for `/api/webhooks/alchemy`. */
    ALCHEMY_BASE_SEPOLIA_WH_SK: z.string().min(1),

    // ── Gemini ─────────────────────────────────────────────────────────
    GOOGLE_API_KEY: z.string().min(1),
    GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),

    // ── Inngest ────────────────────────────────────────────────────────
    /** Only needed against Inngest Cloud; the local Dev Server needs none. */
    INNGEST_SIGNING_KEY: z.string().min(1).optional(),
    /** Omit to use Inngest Cloud in production, the Dev Server otherwise. */
    INNGEST_API_BASE_URL: baseUrl().optional(),

    /**
     * Dev-only: skip the DKG `publishAssertion` write in `mint-r-ka` and
     * substitute a synthetic R-KA UAL, so the full
     * requestPhase1 → oracle → fulfillPhase1 flow runs without a healthy DKG
     * write quorum. Never enable in production.
     */
    DEV_SKIP_DKG_MINT: z.enum(["true", "false"]).optional(),
  },
  experimental__runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
});

/** Inngest REST base: explicit override, else cloud in prod, else Dev Server. */
export const inngestApiBaseUrl: string =
  env.INNGEST_API_BASE_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://api.inngest.com"
    : "http://localhost:8288");
