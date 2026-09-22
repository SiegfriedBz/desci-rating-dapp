import {
  createDkgClient,
  type DkgClient,
  type KnowledgeAssetState,
  type PublicationMetadata,
} from "@desci/dkg-client";
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

/**
 * A Target KA on the node and not yet on chain. Deliberately narrow: this is a
 * step output, replayed on every later request of the run, so it carries the
 * identity the mint needs and not the quads it was built from.
 *
 * `state` is the daemon's answer straight after the store — reported for the
 * dashboard, not branched on. `mintPublicationToDkg` reads the state itself,
 * and that read is the authoritative one.
 */
export type StoredPublicationKa = {
  name: string;
  subjectUri: string;
  state: KnowledgeAssetState["state"];
};

export type MintPublicationToDkgInput = {
  contextGraphId: string;
  /** Daemon asset name from `storePublicationToDkg`. */
  name: string;
  /** Subject IRI from `storePublicationToDkg`; not derivable from the name. */
  subjectUri: string;
  /** Already-pinned content CID (no ipfs:// prefix), for the result. */
  pdfCid: string;
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

function requireGraphId(contextGraphId: string): string {
  const graphId = contextGraphId.trim();
  if (!graphId) {
    throw new Error("contextGraphId is required");
  }
  return graphId;
}

function requirePdfCid(pdfCid: string): string {
  const cid = pdfCid.trim().replace(/^ipfs:\/\//i, "");
  if (!cid) {
    throw new Error("pdfCid is required");
  }
  return cid;
}

/**
 * One daemon connection, for one call into this module.
 *
 * The connection cannot be shared across the store and the mint: an Inngest
 * step boundary is a process boundary, so the two are separate requests to
 * `/api/inngest` and may land on different instances. Each half therefore pays
 * its own `GET /api/status` and `ensureContextGraph` — two round trips on a
 * healthy daemon, and the reason the split makes nothing faster. The helper
 * exists so there is one copy of the lifecycle rather than one per half.
 */
async function withDkgClient<T>(
  graphId: string,
  run: (client: DkgClient) => Promise<T>
): Promise<T> {
  const client = await createDkgClient();
  try {
    await client.ensureContextGraph(graphId, graphId);
    return await run(client);
  } finally {
    await client.stop();
  }
}

/** Stage 3a: PublicationMetadata → Target KA quads on the node. No UAL yet. */
export async function storePublicationToDkg(
  input: PublishPublicationToDkgInput
): Promise<StoredPublicationKa> {
  const graphId = requireGraphId(input.contextGraphId);
  const pdfCid = requirePdfCid(input.pdfCid);

  return withDkgClient(graphId, async (client) => {
    const stored = await client.storePublication({
      contextGraphId: graphId,
      name: input.name,
      meta: { ...input.meta, pdfCid },
    });
    const { state } = await client.readAssetState(stored.name, graphId);
    return { ...stored, state };
  });
}

/** Stage 3b: stored Target KA → minted NFT → Target KA UAL. */
export async function mintPublicationToDkg(
  input: MintPublicationToDkgInput
): Promise<PdfToKaResult> {
  const graphId = requireGraphId(input.contextGraphId);
  const pdfCid = requirePdfCid(input.pdfCid);
  const name = input.name.trim();
  if (!name) {
    throw new Error("name is required");
  }

  return withDkgClient(graphId, async (client) => {
    const { ual } = await client.mintAsset({ contextGraphId: graphId, name });
    return {
      ual,
      name,
      subjectUri: input.subjectUri,
      pdfCid,
      pdfIpfsUri: ipfsUriForCid(pdfCid),
    };
  });
}

/**
 * Stage 3: PublicationMetadata → publication Target KA, store and mint in one
 * call. For callers with no step boundary to put between the halves — see
 * `runPdfToKaAgent` and the `pnpm dkg:publish-pdf` CLI.
 */
export async function publishPublicationToDkg(
  input: PublishPublicationToDkgInput
): Promise<PdfToKaResult> {
  const graphId = requireGraphId(input.contextGraphId);
  const pdfCid = requirePdfCid(input.pdfCid);

  return withDkgClient(graphId, async (client) => {
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
  });
}

/**
 * GROBID TEI → Gemini PublicationMetadata → publication Target KA.
 * Caller must pin first and pass `pdf` + `pdfCid` (no Pinata / path I/O here).
 *
 * One call, so a failure restarts the whole pipeline. Callers that can retry
 * a stage independently should drive the stages themselves — see
 * `publishPdfFunction`, which also splits the publish into store and mint.
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
