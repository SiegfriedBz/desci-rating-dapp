"use client";

import { AlertTriangleIcon } from "lucide-react";
import { DKG_MINT_TARGET_KA_STEP, isQuorumFailure } from "@desci/shared";
import { PublishErrorAction } from "@/lib/publish-types";

type PublishKaErrorNoticeProps = {
  action: PublishErrorAction.Resume | PublishErrorAction.None;
  error: string | null;
  eventId: string | null;
  /** Step a failed run stopped on, when Inngest named one. */
  failedStep: string | null;
};

/**
 * Shown in the two error states that already sent a `pdf.submitted`. The file
 * picker is deliberately absent from both: there is nothing left to publish
 * here, only something to watch again or to abandon.
 */
export function PublishKaErrorNotice({
  action,
  error,
  eventId,
  failedStep,
}: PublishKaErrorNoticeProps) {
  const lostWatch = action === PublishErrorAction.Resume;
  // A quorum failure is the DKG network declining the write, not a verdict on
  // the paper, and the two want opposite advice: the generic copy tells the
  // user to upload again, which for a paper already stored on the daemon
  // publishes a second Knowledge Asset for it.
  const quorum = !lostWatch && isQuorumFailure(error);
  // Independent of the cause: a failure on the mint step means every stage
  // before it succeeded, so the KA is on the daemon whatever stopped the mint.
  const storedNotMinted = !lostWatch && failedStep === DKG_MINT_TARGET_KA_STEP;

  return (
    <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {lostWatch
            ? "Lost track of the job"
            : quorum
              ? "The DKG network declined the write"
              : "Publish job failed"}
        </p>
      </div>
      <p className="text-sm text-foreground">
        {lostWatch
          ? "The publish job is still running on its own — only our status check stopped. Resume checking to pick it back up. Uploading the PDF again would publish a second Knowledge Asset for the same paper."
          : quorum
            ? "Publishing needs three DKG peers to acknowledge the write, and not enough of them answered in time. That describes the network at that moment, not your PDF — the same file will usually go through on a later attempt."
            : "The run itself failed, so there is nothing left to wait for. Clear to start over — that uploads the PDF again and publishes a new Knowledge Asset."}
      </p>
      {storedNotMinted ? (
        <p className="text-sm text-foreground">
          Your paper reached the DKG and only the on-chain mint is missing.
          Retry minting finishes this one — uploading the PDF again would
          publish a second Knowledge Asset for a paper the graph already holds.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {eventId ? (
        <p className="font-mono text-[11px] break-all text-muted">
          Job: {eventId}
        </p>
      ) : null}
    </div>
  );
}
