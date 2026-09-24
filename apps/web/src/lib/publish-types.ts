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
  /** `run_started_at` as epoch ms. Absent until Inngest reports a run. */
  startedAt?: number;
};

/**
 * What a poll of `getPublishStatus` comes back with.
 *
 * A failure is a value here rather than a throw, and that is the whole point
 * of the type. Next serialises a *thrown* server-action error through React,
 * which in production replaces the message with "An error occurred in the
 * Server Components render. The specific message is omitted in production
 * builds…" and a digest. So a thrown diagnostic is one the user never reads,
 * and the poll's failures are exactly the thing this modal has to be able to
 * explain. A returned value crosses the boundary untouched.
 *
 * `ok: false` says only that this reading was lost. It says nothing about the
 * job, which keeps running through every one of them.
 */
export type PublishStatusRead =
  | { ok: true; data: PublishStatusResult }
  | { ok: false; error: string };

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
 * Polls to tolerate before treating a lost reading as a failure. A lost
 * reading says nothing about the job. `getPublishStatus` returns `ok: false`
 * for every answer it cannot use — Inngest unreachable, any non-OK status, a
 * body that is not JSON — and the call itself can still throw when no request
 * completes at all, so a 502 from the Inngest API, a Vercel redeploy and a
 * laptop losing wifi all come to the same thing, and the job keeps running
 * through every one of them. The window is therefore chosen as tolerated
 * blackout rather than as a count — 40 ticks at 3 s is two minutes, long
 * enough to ride out a deployment, short enough that a genuinely dead poll
 * still reports well inside the job's own 20m finish window.
 */
export const PUBLISH_STATUS_ERROR_GRACE_TICKS = 40;

/**
 * How long a stored event id may still be believed. `publishPdfFunction` gives
 * a run a 20m finish window, so an id older than that cannot name a live job.
 * Without the expiry a forgotten id would be restored over an unrelated later
 * publish and watch a run that ended hours ago.
 */
export const PUBLISH_JOB_TTL_MS = 20 * 60 * 1000;

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

/** Where the Processing ramp starts, and the value it approaches forever. */
const PROCESSING_FLOOR = 30;
const PROCESSING_CEILING = 95;

/**
 * Time constant of the Processing ramp. A publish takes 5–10 minutes, so four
 * minutes puts the bar near two thirds at the low end of that range and keeps
 * it climbing — ever slower, but never stopping — well past the high end.
 */
const PROCESSING_TAU_MS = 4 * 60 * 1000;

/**
 * Processing is a single Inngest run with nothing readable inside it: the
 * status API reports a run's status and output, never which step it is on. So
 * the bar is drawn against the clock rather than against progress it cannot
 * see, and it decays towards a ceiling instead of marching to a deadline —
 * which keeps it honest about a run that is late without ever claiming the run
 * is done. The run is finished when Inngest says so, not when the bar fills.
 */
export function progressForPhase(
  phase: PublishModalPhase,
  elapsedMs = 0
): number {
  switch (phase) {
    case PublishModalPhase.Uploading:
      return 25;
    case PublishModalPhase.Processing:
      return Math.round(
        PROCESSING_FLOOR +
          (PROCESSING_CEILING - PROCESSING_FLOOR) *
            (1 - Math.exp(-Math.max(elapsedMs, 0) / PROCESSING_TAU_MS))
      );
    case PublishModalPhase.Done:
      return 100;
    default:
      return 0;
  }
}

/** `4m 12s`. Minutes stay unpadded so the string does not start with a zero. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function isBusyPhase(phase: PublishModalPhase): boolean {
  return (
    phase === PublishModalPhase.Uploading ||
    phase === PublishModalPhase.Processing
  );
}
