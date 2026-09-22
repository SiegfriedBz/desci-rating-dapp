export enum PublishJobStatus {
  Queued = "Queued",
  Running = "Running",
  Completed = "Completed",
  Failed = "Failed",
  /** Inngest knows no run for this event id. */
  NotFound = "NotFound",
}

/** UI phase for the Publish KA modal (distinct from Inngest run status). */
export enum PublishModalPhase {
  Idle = "idle",
  Uploading = "uploading",
  Processing = "processing",
  Done = "done",
  Error = "error",
}

/**
 * What the modal may safely offer once it is in `Error`. The three differ by
 * what is known to be running, not by what went wrong: publishing again sends
 * a second `pdf.submitted` under a fresh `desci-pub-*` name, so it is offered
 * only where nothing was sent.
 */
export enum PublishErrorAction {
  /** No event id — the upload or the send failed. Publishing again is safe. */
  Retry = "retry",
  /** A job is out there and only the poll died. Watch it again. */
  Resume = "resume",
  /** Inngest reported the run failed. No primary action is safe. */
  None = "none",
}

export type PublishStatusResult = {
  status: PublishJobStatus;
  ual?: string;
  error?: string;
};

/** Max PDF upload size (5 MB). Enforced in UI and server action. */
export const MAX_PDF_BYTES = 5 * 1024 * 1024;

export const MAX_PDF_MB = MAX_PDF_BYTES / (1024 * 1024);

/** Poll interval for Inngest job status while the modal is open. */
export const PUBLISH_STATUS_POLL_MS = 3_000;

/**
 * Polls to tolerate before treating `NotFound` as a failure. Inngest can lag a
 * moment behind `send()`, but a persistent miss means the poll is reading a
 * different environment than the one the event went to.
 */
export const PUBLISH_STATUS_GRACE_TICKS = 10;

/**
 * Polls to tolerate before treating a *thrown* poll as a failure. A throw says
 * nothing about the job: `getPublishStatus` throws on any non-OK HTTP status
 * as well as on transport failure, so a 502 from the Inngest API, a Vercel
 * redeploy and a laptop losing wifi all look the same, and the job keeps
 * running through every one of them. The window is therefore chosen as
 * tolerated blackout rather than as a count — 40 ticks at 3 s is two minutes,
 * long enough to ride out a deployment, short enough that a genuinely dead
 * poll still reports before the job's own 10m finish window closes.
 */
export const PUBLISH_STATUS_ERROR_GRACE_TICKS = 40;

/** Accept common PDF MIME types and `.pdf` extension (some OS/browsers omit type). */
export function isPdfFile(file: File): boolean {
  const type = file.type.trim().toLowerCase();
  if (
    type === "application/pdf" ||
    type === "application/x-pdf" ||
    type === "application/acrobat"
  ) {
    return true;
  }
  // Empty or generic binary type — fall back to extension.
  if (!type || type === "application/octet-stream") {
    return file.name.toLowerCase().endsWith(".pdf");
  }
  return file.name.toLowerCase().endsWith(".pdf");
}

export function progressForPhase(phase: PublishModalPhase): number {
  switch (phase) {
    case PublishModalPhase.Uploading:
      return 25;
    case PublishModalPhase.Processing:
      return 65;
    case PublishModalPhase.Done:
      return 100;
    default:
      return 0;
  }
}

export function isBusyPhase(phase: PublishModalPhase): boolean {
  return (
    phase === PublishModalPhase.Uploading ||
    phase === PublishModalPhase.Processing
  );
}
