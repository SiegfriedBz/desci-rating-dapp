"use client";

import { AlertTriangleIcon } from "lucide-react";
import { PublishErrorAction } from "@/lib/publish-types";

type PublishKaErrorNoticeProps = {
  action: PublishErrorAction.Resume | PublishErrorAction.None;
  error: string | null;
  eventId: string | null;
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
}: PublishKaErrorNoticeProps) {
  const lostWatch = action === PublishErrorAction.Resume;

  return (
    <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="size-4 shrink-0 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {lostWatch ? "Lost track of the job" : "Publish job failed"}
        </p>
      </div>
      <p className="text-sm text-foreground">
        {lostWatch
          ? "The publish job is still running on its own — only our status check stopped. Resume checking to pick it back up. Uploading the PDF again would publish a second Knowledge Asset for the same paper."
          : "The run itself failed, so there is nothing left to wait for. Clear to start over — that uploads the PDF again and publishes a new Knowledge Asset."}
      </p>
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
