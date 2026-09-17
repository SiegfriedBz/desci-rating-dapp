import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Client env — `NEXT_PUBLIC_*` only, so server variable names are never
 * shipped to the browser. Each key is destructured in `runtimeEnv` because
 * Next.js only inlines variables it sees accessed literally.
 */
export const clientEnv = createEnv({
  client: {
    /** Deployed origin; used for Reown AppKit `metadata.url`. */
    NEXT_PUBLIC_APP_URL: z.string().url(),
    /** Omit to disable wallet connect — the header shows a configure hint. */
    NEXT_PUBLIC_REOWN_PROJECT_ID: z.string().min(1).optional(),
    /**
     * `RatingController` for this environment — resolved by
     * `getRatingControllerAddress` in `@desci/contracts`. Required, not
     * optional: a fallback would let a misconfigured deployment silently
     * talk to whichever contract the last deploy generated.
     */
    NEXT_PUBLIC_RATING_CONTROLLER_ADDRESS: z
      .string()
      .regex(/^0x[0-9a-fA-F]{40}$/, "expected a 20-byte hex address"),
    /** Footer links; omit either one to hide it. */
    NEXT_PUBLIC_CONTACT_PORTFOLIO_URL: z.string().url().optional(),
    NEXT_PUBLIC_CONTACT_LINKEDIN_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_REOWN_PROJECT_ID: process.env.NEXT_PUBLIC_REOWN_PROJECT_ID,
    NEXT_PUBLIC_RATING_CONTROLLER_ADDRESS:
      process.env.NEXT_PUBLIC_RATING_CONTROLLER_ADDRESS,
    NEXT_PUBLIC_CONTACT_PORTFOLIO_URL:
      process.env.NEXT_PUBLIC_CONTACT_PORTFOLIO_URL,
    NEXT_PUBLIC_CONTACT_LINKEDIN_URL:
      process.env.NEXT_PUBLIC_CONTACT_LINKEDIN_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
});
