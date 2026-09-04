import { createDkgClient } from "@desci/dkg-client";
import { ipfsUriForCid } from "../../ipfs/uri.js";
import { extractPublicationMetadata } from "./extract/extract.js";
import { processPdfWithGrobid } from "./grobid/client.js";
import { extractTeiSections } from "./grobid/index.js";

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

/**
 * GROBID TEI → Gemini PublicationMetadata → publication Target KA.
 * Caller must pin first and pass `pdf` + `pdfCid` (no Pinata / path I/O here).
 */
export async function runPdfToKaAgent(
  input: RunPdfToKaAgentInput
): Promise<PdfToKaResult> {
  const graphId = input.contextGraphId.trim();
  if (!graphId) {
    throw new Error("contextGraphId is required");
  }

  const pdfCid = input.pdfCid.trim().replace(/^ipfs:\/\//i, "");
  if (!pdfCid) {
    throw new Error("pdfCid is required");
  }
  if (input.pdf.byteLength === 0) {
    throw new Error("pdf bytes are empty");
  }

  const teiXml = await processPdfWithGrobid(input.pdf, input.filename);
  const tei = extractTeiSections(teiXml);
  const meta = await extractPublicationMetadata(tei);
  meta.pdfCid = pdfCid;

  const client = await createDkgClient();
  try {
    await client.ensureContextGraph(graphId, graphId);
    const published = await client.publishPublication({
      contextGraphId: graphId,
      name: input.name,
      meta,
    });
    return {
      ...published,
      pdfCid,
      pdfIpfsUri: ipfsUriForCid(pdfCid),
    };
  } finally {
    await client.stop();
  }
}
