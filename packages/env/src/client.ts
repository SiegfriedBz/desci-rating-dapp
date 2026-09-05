import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Client-safe env — only `NEXT_PUBLIC_*`. Import from `@desci/env/client`
 * in Client Components / browser bundles. Never import `@desci/env` (server
 * entry) from client code: it eagerly reads server secrets.
 */
export const clientEnv = createEnv({
  clientPrefix: "NEXT_PUBLIC_",
  client: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1).optional(),
    NEXT_PUBLIC_CONTACT_PORTFOLIO_URL: z.string().url().optional(),
    NEXT_PUBLIC_CONTACT_LINKEDIN_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    NEXT_PUBLIC_CONTACT_PORTFOLIO_URL:
      process.env.NEXT_PUBLIC_CONTACT_PORTFOLIO_URL,
    NEXT_PUBLIC_CONTACT_LINKEDIN_URL:
      process.env.NEXT_PUBLIC_CONTACT_LINKEDIN_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
});

/** Reown AppKit project id. */
export const reownProjectId: string | undefined =
  clientEnv.NEXT_PUBLIC_REOWN_PROJECT_ID;
