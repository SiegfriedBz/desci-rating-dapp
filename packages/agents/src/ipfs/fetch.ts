import { env } from "@desci/env";
import { bareCid } from "./uri.js";

const DEFAULT_GATEWAY = "https://ipfs.io/ipfs";

function gatewayBaseUrl(): string {
  return (env.IPFS_GATEWAY_URL || DEFAULT_GATEWAY).replace(/\/$/, "");
}

/**
 * Fetch PDF bytes from an IPFS HTTP gateway by CID.
 * For UI viewers and CID-only jobs — not used by the CLI after a local pin.
 */
export async function fetchPdfByCid(cid: string): Promise<Uint8Array> {
  const path = bareCid(cid);
  const url = `${gatewayBaseUrl()}/${path}`;

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
