import { env } from "@desci/env";

const DEFAULT_GROBID_URL = "http://127.0.0.1:8070";
const DEFAULT_TIMEOUT_MS = 120_000;

function grobidBaseUrl(): string {
  return (env.GROBID_URL || DEFAULT_GROBID_URL).replace(/\/$/, "");
}

function grobidTimeoutMs(): number {
  return env.GROBID_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS;
}

/**
 * POST PDF bytes to GROBID `/api/processFulltextDocument` and return TEI-XML.
 */
export async function processPdfWithGrobid(
  pdf: Uint8Array,
  filename = "paper.pdf"
): Promise<string> {
  const url = `${grobidBaseUrl()}/api/processFulltextDocument`;
  const form = new FormData();
  form.append(
    "input",
    new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    filename || "paper.pdf"
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), grobidTimeoutMs());

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `GROBID request failed (${url}): ${message}. Is Docker/GROBID running? Try \`pnpm grobid:up\` and curl ${grobidBaseUrl()}/api/isalive`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `GROBID returned HTTP ${response.status} from ${url}. ${body.slice(0, 200)} Is Docker/GROBID running?`
    );
  }

  return response.text();
}
