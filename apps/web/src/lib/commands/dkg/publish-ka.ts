"use server";

import { InngestEvent, inngest } from "@desci/agents/inngest";
import { pinPdfToIpfs } from "@desci/agents/ipfs";
import {
  isPdfFile,
  MAX_PDF_BYTES,
  MAX_PDF_MB,
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

/**
 * Finish a publish whose Target KA was stored but never minted.
 *
 * Takes the id of the original `pdf.submitted` event, because that id is what
 * the asset name was derived from. Sending `pdf.submitted` again would take a
 * new id and publish a second Knowledge Asset for the same paper, which is the
 * outcome this whole path exists to avoid.
 *
 * Returns the new event id: the modal watches the mint run from here on, and
 * the publish run it replaces has already reached a verdict.
 */
export async function retryPublishMint(
  publishEventId: string
): Promise<{ eventId: string }> {
  const trimmed = publishEventId.trim();
  if (!trimmed) {
    throw new Error("publishEventId is required");
  }

  const sent = await inngest.send({
    name: InngestEvent.PdfMintRequested,
    data: { publishEventId: trimmed },
  });
  const eventId = sent.ids[0];
  if (!eventId) {
    throw new Error("Inngest did not return an event id");
  }

  return { eventId };
}
