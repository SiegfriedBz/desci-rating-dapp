import { env, requireEnv } from "@desci/env";
import { ipfsUriForCid } from "./uri.js";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export type PinPdfResult = {
  /** Content CID (no scheme). */
  cid: string;
  /** Content-addressed URI stored on the KA and used for retrieval. */
  ipfsUri: string;
};

/**
 * Pin PDF bytes to IPFS via Pinata `pinFileToIPFS`.
 * Returns the content CID / `ipfs://` URI (gateway-independent).
 * Pinata is pin-only — use `fetchPdfByCid` for retrieval.
 */
export async function pinPdfToIpfs(
  pdf: Uint8Array,
  filename = "paper.pdf"
): Promise<PinPdfResult> {
  const jwt = requireEnv(
    env.PINATA_JWT,
    "PINATA_JWT is required to pin the PDF to IPFS. Set it in the repo-root .env"
  );
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    filename || "paper.pdf"
  );

  let response: Response;
  try {
    response = await fetch(PINATA_PIN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: form,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Pinata pinFileToIPFS request failed: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Pinata returned HTTP ${response.status}. ${body.slice(0, 300)}`
    );
  }

  const json = (await response.json()) as { IpfsHash?: string };
  const cid = json.IpfsHash?.trim();
  if (!cid) {
    throw new Error("Pinata response missing IpfsHash (CID)");
  }

  return { cid, ipfsUri: ipfsUriForCid(cid) };
}
