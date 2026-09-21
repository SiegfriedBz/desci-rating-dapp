import { createDkgClient, type PublicationMetadata } from "@desci/dkg-client";
import { ipfsUriForCid } from "../../ipfs/uri.js";
import { extractPublicationMetadata } from "./extract/extract.js";
import { processPdfWithGrobid } from "./grobid/client.js";
import { extractTeiSections } from "./grobid/index.js";
import type { TeiSections } from "./grobid/types.js";

export type PdfToKaResult = {
  ual: string;
  name: string;
  subjectUri: string;
  /** IPFS CID of the pinned PDF (no ipfs:// prefix). */
  pdfCid: string;
  /** Content-addressed URI (`ipfs://…`) stored on the KA. */
  pdfIpfsUri: string;
};

export type RunPdfToKaAgentInput = {
  /** PDF bytes (already available to the caller — do not fetch inside the agent). */
  pdf: Uint8Array;
  /** Already-pinned content CID (no ipfs:// prefix). Written onto the KA. */
  pdfCid: string;
  contextGraphId: string;
  name?: string;
  /** Optional filename hint for GROBID multipart upload. */
  filename?: string;
};

export type PublishPublicationToDkgInput = {
  meta: PublicationMetadata;
  /** Already-pinned content CID (no ipfs:// prefix). Written onto the KA. */
  pdfCid: string;
  contextGraphId: string;
  /**
   * Daemon asset name. Publishing returns the existing UAL when a name is
   * already minted, so a caller that can be retried should pass a name
   * derived from its own identity rather than letting one be generated.
   */
  name?: string;
};

/** Stage 1: PDF bytes → GROBID TEI → the slices Gemini reads. */
export async function extractTeiFromPdf(input: {
  pdf: Uint8Array;
  filename?: string;
}): Promise<TeiSections> {
  if (input.pdf.byteLength === 0) {
    throw new Error("pdf bytes are empty");
  }
  const teiXml = await processPdfWithGrobid(input.pdf, input.filename);
  return extractTeiSections(teiXml);
}

/** Stage 3: PublicationMetadata → publication Target KA. */
export async function publishPublicationToDkg(
  input: PublishPublicationToDkgInput
): Promise<PdfToKaResult> {
  const graphId = input.contextGraphId.trim();
  if (!graphId) {
    throw new Error("contextGraphId is required");
  }

  const pdfCid = input.pdfCid.trim().replace(/^ipfs:\/\//i, "");
  if (!pdfCid) {
    throw new Error("pdfCid is required");
  }

  const client = await createDkgClient();
  try {
    await client.ensureContextGraph(graphId, graphId);
    const publication = await client.publishPublication({
      contextGraphId: graphId,
      name: input.name,
      meta: { ...input.meta, pdfCid },
    });
    return {
      ...publication,
      pdfCid,
      pdfIpfsUri: ipfsUriForCid(pdfCid),
    };
  } finally {
    await client.stop();
  }
}

/**
 * GROBID TEI → Gemini PublicationMetadata → publication Target KA.
 * Caller must pin first and pass `pdf` + `pdfCid` (no Pinata / path I/O here).
 *
 * One call, so a failure restarts the whole pipeline. Callers that can retry
 * a stage independently should drive the three stages themselves — see
 * `publishPdfFunction`.
 */
export async function runPdfToKaAgent(
  input: RunPdfToKaAgentInput
): Promise<PdfToKaResult> {
  const tei = await extractTeiFromPdf({
    pdf: input.pdf,
    filename: input.filename,
  });
  const meta = await extractPublicationMetadata(tei);

  return publishPublicationToDkg({
    meta,
    pdfCid: input.pdfCid,
    contextGraphId: input.contextGraphId,
    name: input.name,
  });
}
