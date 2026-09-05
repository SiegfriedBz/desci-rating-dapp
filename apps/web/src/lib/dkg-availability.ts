import "server-only";

import { probeDkgDaemon } from "@desci/dkg-client";

/** User-facing copy when DKG is offline (never leak probe/auth internals). */
export const DKG_UNAVAILABLE_USER_MESSAGE =
  "DKG connection not available. Please try again later.";

export const DKG_CATALOG_UNAVAILABLE_MESSAGE = `Catalog unavailable — ${DKG_UNAVAILABLE_USER_MESSAGE}`;

export type DkgAvailability = {
  available: boolean;
  /** Short user-facing reason when unavailable. */
  reason: string | null;
};

/**
 * Fast server-side check used by the landing page to gate catalog + CTAs.
 * Does not use connectDaemon's multi-second ready retries.
 */
export async function getDkgAvailability(): Promise<DkgAvailability> {
  const result = await probeDkgDaemon();
  if (result.ok) {
    return { available: true, reason: null };
  }
  return {
    available: false,
    reason: DKG_UNAVAILABLE_USER_MESSAGE,
  };
}
