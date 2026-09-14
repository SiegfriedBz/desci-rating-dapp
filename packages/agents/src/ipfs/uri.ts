import { normalizeIpfsIri } from "@desci/dkg-client";

/** Build a content-addressed `ipfs://…` URI from a CID (throws if empty/invalid). */
export function ipfsUriForCid(cid: string): string {
  const uri = normalizeIpfsIri(cid);
  if (!uri) {
    throw new Error("CID is empty or invalid");
  }
  return uri;
}

/** Strip `ipfs://` and whitespace; return bare CID path segment. */
export function bareCid(cid: string): string {
  const trimmed = cid.trim().replace(/^ipfs:\/\//i, "");
  if (!trimmed || trimmed.includes("/") || /\s/.test(trimmed)) {
    throw new Error(`Invalid CID: ${cid}`);
  }
  return trimmed;
}
