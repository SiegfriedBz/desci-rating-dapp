export enum PublishJobStatus {
  Queued = "Queued",
  Running = "Running",
  Completed = "Completed",
  Failed = "Failed",
}

/** UI phase for the Publish KA modal (distinct from Inngest run status). */
export enum PublishModalPhase {
  Idle = "idle",
  Uploading = "uploading",
  Processing = "processing",
  Done = "done",
  Error = "error",
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
