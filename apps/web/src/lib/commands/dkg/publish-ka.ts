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
