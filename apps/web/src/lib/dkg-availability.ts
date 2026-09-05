import "server-only";

import { probeDkgDaemon } from "@desci/dkg-client";

export type DkgAvailability = {
  available: boolean;
  /** Short user-facing reason when unavailable. */
  reason: string | null;
};

const UNAVAILABLE_FALLBACK =
  "DKG daemon not reachable in this environment.";

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
    reason: result.reason.trim() || UNAVAILABLE_FALLBACK,
  };
}
