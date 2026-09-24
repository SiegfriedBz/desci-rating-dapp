import { env } from "@desci/env";
import { DKG_MINT_TARGET_KA_STEP, isQuorumFailure } from "@desci/shared";
import { RetryAfterError } from "inngest";
import {
  extractPublicationMetadata,
  extractTeiFromPdf,
  mintPublicationToDkg,
  storePublicationToDkg,
} from "../../../agents/pdf-to-ka/index.js";
import { fetchPdfByCid } from "../../../ipfs/index.js";
import { InngestEvent, inngest } from "../client.js";

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
const QUORUM_RETRY_DELAY = "2m";

/**
 * Daemon asset name for a publish, derived from the id of the event that
 * started it.
 *
 * Exported because the mint-retry function has to arrive at the same name from
 * the same id — that is the whole basis on which a second attempt finds the
 * stored asset instead of creating another one.
 */
export function targetKaName(publishEventId: string): string {
  return `desci-pub-${publishEventId}`;
}

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

export const publishPdfFunction = inngest.createFunction(
  {
    id: "publish-pdf",
    // Five attempts rather than three, because the three the mint had were
    // spent in under six minutes against a peer set that needed longer than
    // that to recover. Retries are cheap here: every earlier stage is memoized
    // and `mintAsset` returns the existing UAL when the name is already
    // minted, so an attempt that is no longer needed costs one state read.
    retries: 4,
    // Has to cover the whole retry schedule, not one attempt: five attempts of
    // a mint that has been measured at ~300s, plus the 2m waits between the
    // ones that hit quorum. `PUBLISH_JOB_TTL_MS` in `apps/web` mirrors this
    // number so a stored event id cannot outlive the run it names.
    timeouts: { finish: "45m" },
  },
  { event: InngestEvent.PdfSubmitted },
  async ({ event, runId, step }) => {
    const { pdfCid, filename } = event.data;

    // Stable across attempts of the store step, so a store that landed but lost
    // its response is recognised as already stored rather than duplicated. A
    // new submission is a new event, so a deliberate republish still mints.
    const kaName = targetKaName(event.id ?? runId);

    // The PDF is fetched here rather than in its own step: step output is
    // persisted and replayed on every later request, and base64 bytes are far
    // more expensive to carry than the TEI slices this returns.
    const tei = await step.run("grobid-extract", async () => {
      const pdf = await fetchPdfByCid(pdfCid);
      return extractTeiFromPdf({ pdf, filename });
    });

    const meta = await step.run("gemini-structure", () =>
      extractPublicationMetadata(tei)
    );

    // Two steps rather than one, so each daemon call gets its own maxDuration
    // window and its own retries. A retry of the mint replays this step's saved
    // result instead of storing the quads a second time.
    const stored = await step.run("dkg-store-target-ka", () =>
      storePublicationToDkg({
        meta,
        pdfCid,
        contextGraphId: env.DKG_CONTEXT_GRAPH_ID,
        name: kaName,
      })
    );

    const result = await step.run(DKG_MINT_TARGET_KA_STEP, async () => {
      try {
        return await mintPublicationToDkg({
          contextGraphId: env.DKG_CONTEXT_GRAPH_ID,
          name: stored.name,
          subjectUri: stored.subjectUri,
          pdfCid,
        });
      } catch (err) {
        throw withQuorumBackoff(err);
      }
    });

    return { ual: result.ual, pdfCid: result.pdfCid };
  }
);
