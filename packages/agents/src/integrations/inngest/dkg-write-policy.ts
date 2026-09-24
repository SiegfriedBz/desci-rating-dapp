import { isQuorumFailure } from "@desci/shared";
import { RetryAfterError } from "inngest";

/**
 * Retry policy for the DKG writes, shared by both flows.
 *
 * A quorum decline is a property of the network, not of what is being written,
 * so publishing a paper and rating one meet it on identical terms — both end
 * in `client.mintAsset` against the same peer set. Keeping the numbers here
 * rather than in either function is what stops one flow from being hardened
 * and the other from quietly keeping the defaults, which is exactly what
 * happened between them before this module existed.
 */

/**
 * How long to wait before retrying a write the DKG network declined.
 *
 * Inngest's own backoff starts in seconds, which puts the retry back on the
 * same peers that were unavailable a moment earlier. Run
 * `01M39PSEVNBT6SHX18EGQZ67D8` spent all three of its attempts inside six
 * minutes for exactly that reason and then gave up, when the condition it hit
 * — `CORE_TEMPORARILY_UNAVAILABLE` on one peer and a transport timeout on
 * another — is the kind that clears on its own given a few minutes.
 */
export const QUORUM_RETRY_DELAY = "2m";

/**
 * Attempts to allow a function whose slowest step is a DKG write.
 *
 * Five rather than the default three, because three were spent in under six
 * minutes against a peer set that needed longer than that to recover. Retries
 * are cheap: earlier steps are memoized, and `mintAsset` returns the existing
 * UAL when the name is already minted, so a redundant attempt costs one read.
 */
export const DKG_WRITE_RETRIES = 4;

/**
 * Wall-clock budget for a run containing a DKG write.
 *
 * Has to cover the whole retry schedule rather than one attempt: five attempts
 * of a mint measured at ~300s, plus the {@link QUORUM_RETRY_DELAY} waits
 * between the ones that hit quorum. `PUBLISH_JOB_TTL_MS` in `apps/web` mirrors
 * this so a stored event id cannot outlive the run it names.
 */
export const DKG_WRITE_FINISH_TIMEOUT = "45m";

/**
 * Ask Inngest for a long wait when the DKG declined the write, and leave every
 * other error exactly as it was. This does not make a failure retryable that
 * was not already: it only changes *when* the retry happens, for the one cause
 * where trying again immediately is known to be pointless.
 */
export function withQuorumBackoff(err: unknown): unknown {
  const message = err instanceof Error ? err.message : String(err);
  if (!isQuorumFailure(message)) {
    return err;
  }
  return new RetryAfterError(message, QUORUM_RETRY_DELAY, { cause: err });
}
