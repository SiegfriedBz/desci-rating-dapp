import { ipfsGatewayUrl } from "@desci/env";
import { bareCid } from "./uri.js";

/**
 * Fetch PDF bytes from the configured IPFS HTTP gateway (`ipfsGatewayUrl`
 * from `@desci/env` — `IPFS_GATEWAY_URL` or Pinata public gateway default).
 */
export async function fetchPdfByCid(cid: string): Promise<Uint8Array> {
  const base = ipfsGatewayUrl.replace(/\/$/, "");
  const path = bareCid(cid);
  const url = `${base}/${path}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`IPFS gateway fetch failed (${url}): ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `IPFS gateway returned HTTP ${response.status} from ${url}. ${body.slice(0, 200)}`
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error(`IPFS gateway returned empty body for CID ${path}`);
  }
  return buffer;
}
