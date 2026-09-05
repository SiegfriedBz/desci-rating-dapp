"use server";

import { InngestEvent, inngest } from "@desci/agents/inngest";
import { pinPdfToIpfs } from "@desci/agents/ipfs";
import { env, inngestApiBaseUrl } from "@desci/env";
import {
  isPdfFile,
  MAX_PDF_BYTES,
  MAX_PDF_MB,
  PublishJobStatus,
  type PublishStatusResult,
} from "@/lib/publish-types";

/**
 * Pin a PDF to IPFS and enqueue the GROBID → Gemini → DKG publish job.
 * Returns the Inngest event id used for status polling.
 */
export async function uploadAndPin(
  formData: FormData
): Promise<{ eventId: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Missing PDF file");
  }
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are accepted");
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error(`PDF exceeds the ${MAX_PDF_MB} MB limit`);
  }
  if (file.size === 0) {
    throw new Error("PDF file is empty");
  }

  const filename = file.name?.trim() || "paper.pdf";
  const pdf = new Uint8Array(await file.arrayBuffer());
  const pinned = await pinPdfToIpfs(pdf, filename);

  const sent = await inngest.send({
    name: InngestEvent.PdfSubmitted,
    data: { pdfCid: pinned.cid, filename },
  });
  const eventId = sent.ids[0];
  if (!eventId) {
    throw new Error("Inngest did not return an event id");
  }

  return { eventId };
}

type InngestRun = {
  status?: string;
  output?: { ual?: string; error?: string } | string;
  error?: string | { message?: string };
};

type InngestRunsResponse = {
  data?: InngestRun[];
};

function mapInngestStatus(raw: string | undefined): PublishJobStatus {
  switch (raw) {
    case "Completed":
      return PublishJobStatus.Completed;
    case "Failed":
    case "Cancelled":
      return PublishJobStatus.Failed;
    case "Running":
      return PublishJobStatus.Running;
    case "Queued":
    case "Scheduled":
    default:
      return PublishJobStatus.Queued;
  }
}

/**
 * Poll Inngest for the status of a `pdf.submitted` run.
 * Called every few seconds from the Publish KA modal.
 */
export async function getPublishStatus(
  eventId: string
): Promise<PublishStatusResult> {
  const trimmed = eventId.trim();
  if (!trimmed) {
    throw new Error("eventId is required");
  }

  const headers = new Headers();
  if (env.INNGEST_SIGNING_KEY) {
    headers.set("Authorization", `Bearer ${env.INNGEST_SIGNING_KEY}`);
  }

  const res = await fetch(
    `${inngestApiBaseUrl}/v1/events/${encodeURIComponent(trimmed)}/runs`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Inngest status poll failed (HTTP ${res.status}): ${body.slice(0, 200)}`
    );
  }

  const json = (await res.json()) as InngestRunsResponse;
  const run = json.data?.[0];
  if (!run) {
    return { status: PublishJobStatus.Queued };
  }

  const status = mapInngestStatus(run.status);
  let ual: string | undefined;
  let error: string | undefined;

  if (run.output && typeof run.output === "object") {
    ual = run.output.ual;
    error = run.output.error;
  }
  if (!error && typeof run.error === "string") {
    error = run.error;
  } else if (!error && run.error && typeof run.error === "object") {
    error = run.error.message;
  }

  return { status, ual, error };
}
