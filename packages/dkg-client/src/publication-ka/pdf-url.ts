import type { TargetAssetBinding } from "../schema/types.js";
import {
  SCHEMA_CONTENT_URL,
  SCHEMA_ENCODING,
} from "../schema/vocab.js";

/**
 * Extract the first `ipfs://…` PDF content URL from assertion bindings.
 * Prefers `schema:contentUrl`, then falls back to `schema:encoding`.
 */
export function pdfIpfsUrlFromBindings(
  bindings: TargetAssetBinding[]
): string | null {
  for (const b of bindings) {
    if (
      b.predicate === SCHEMA_CONTENT_URL &&
      b.object.startsWith("ipfs://")
    ) {
      return b.object;
    }
  }
  for (const b of bindings) {
    if (b.predicate === SCHEMA_ENCODING && b.object.startsWith("ipfs://")) {
      return b.object;
    }
  }
  return null;
}
