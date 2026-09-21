import type { KnowledgeAssetQuad } from "@desci/shared";
import { sparqlTermValue } from "../../helpers/sparql.js";
import type { TargetAssetBinding } from "../../schema/types.js";
import { daemonRequest } from "../http.js";
import { queryDaemon } from "./query.js";

/**
 * A partial view of `GET /api/knowledge-assets/{name|ual}`, which answers with
 * a much wider payload (`events`, the three `*CurrentAssertion` hashes,
 * `kaNumber`, `reservedUal`, …). Only the fields read here are declared — one
 * type for the route, so a second view of it cannot drift from this one.
 */
type KnowledgeAssetDescriptor = {
  state?: string;
  memoryLayer?: string;
  status?: string;
  assertionGraph?: string;
  publishedUal?: string;
};

/**
 * Where a Knowledge Asset sits in the two-stage publish. `stored` means the
 * quads are on the node and nothing is on chain; `minted` means the NFT is
 * anchored and the UAL is real. The union exists so a caller cannot reach for
 * a UAL without first saying which state it is in — a stored asset also has a
 * UAL-shaped identifier, and handing that one out records an asset that was
 * never anchored.
 */
export type KnowledgeAssetState =
  | { state: "missing" }
  | { state: "stored" }
  | { state: "minted"; ual: string };

/**
 * The daemon's lifecycle vocabulary, translated into ours. It calls the SWM → VM
 * promotion "publish"; here `publish` means the whole store-and-mint operation,
 * so its `published` is our `minted`. This table is the only place that
 * translation happens.
 *
 * `created` (in WM, not yet shared) has never been observed, because both our
 * store call and the CLI's `create --share` finalize and share in one go. It
 * maps to `stored` if it ever appears.
 */
const OUR_STATE_BY_DAEMON_STATE: Record<
  string,
  "stored" | "minted" | undefined
> = {
  created: "stored",
  promoted: "stored",
  published: "minted",
};

function toKnowledgeAssetState(
  descriptor: KnowledgeAssetDescriptor,
  name: string
): KnowledgeAssetState {
  // `memoryLayer` and `status` move with `state` across the mint, so they are
  // corroboration worth reporting, not a second condition to agree with.
  const observed =
    `state=${descriptor.state ?? "?"}, memoryLayer=${descriptor.memoryLayer ?? "?"}, ` +
    `status=${descriptor.status ?? "?"}`;

  const ourState = OUR_STATE_BY_DAEMON_STATE[descriptor.state?.trim() ?? ""];
  if (!ourState) {
    // Guessing is what produced the reserved-UAL bug. Assuming minted records
    // unanchored assets on chain; assuming stored re-drives the mint forever.
    // Throwing surfaces a daemon upgrade instead of absorbing it.
    throw new Error(
      `DKG reports an unrecognised lifecycle for Knowledge Asset "${name}" (${observed}). ` +
        `Refusing to guess whether it is minted.`
    );
  }

  if (ourState === "stored") {
    return { state: "stored" };
  }

  // Not the discriminant — but the union promises a UAL, so fail loudly rather
  // than let the type lie.
  const ual = descriptor.publishedUal?.trim();
  if (!ual) {
    throw new Error(
      `DKG reports Knowledge Asset "${name}" as minted but returned no publishedUal (${observed}).`
    );
  }
  return { state: "minted", ual };
}

/**
 * Lifecycle state of a Knowledge Asset, by daemon name.
 * Only HTTP 404 means "not there"; every other failure propagates, so an
 * outage cannot read as an absent asset.
 */
export async function readKnowledgeAssetState(
  baseUrl: string,
  token: string,
  contextGraphId: string,
  name: string
): Promise<KnowledgeAssetState> {
  let descriptor: KnowledgeAssetDescriptor;
  try {
    descriptor = await daemonRequest<KnowledgeAssetDescriptor>(
      baseUrl,
      token,
      `/api/knowledge-assets/${encodeURIComponent(name)}?${new URLSearchParams({
        contextGraphId,
      }).toString()}`
    );
  } catch (err) {
    if (isHttp404(err)) {
      return { state: "missing" };
    }
    throw err;
  }
  return toKnowledgeAssetState(descriptor, name);
}

/**
 * UAL of a **minted** Knowledge Asset, or null when the name is unknown or
 * stored but not yet minted. The cheap answer for callers that only need to
 * know whether there is a UAL to record.
 */
export async function readMintedUal(
  baseUrl: string,
  token: string,
  contextGraphId: string,
  name: string
): Promise<string | null> {
  const asset = await readKnowledgeAssetState(
    baseUrl,
    token,
    contextGraphId,
    name
  );
  return asset.state === "minted" ? asset.ual : null;
}

function isUnknownAccessPolicyError(message: string): boolean {
  return (
    message.includes("LU-5") ||
    message.includes("publish access-policy is unknown")
  );
}

function unknownAccessPolicyHint(contextGraphId: string): string {
  return (
    `DKG could not confirm on-chain access policy for context graph "${contextGraphId}" ` +
    `(source/target curated=unknown). The node refuses to guess plaintext vs encrypted. ` +
    `Usually a Base Sepolia RPC timeout. Retry, or check the DKG node's RPC and that ` +
    `the graph is registered. Restart with "pnpm dkg:start" if the daemon looks stuck.`
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function publishAssertion(
  baseUrl: string,
  token: string,
  contextGraphId: string,
  name: string,
  quads: KnowledgeAssetQuad[]
): Promise<{ ual: string }> {
  const existingUal = await readMintedUal(baseUrl, token, contextGraphId, name);
  if (existingUal) {
    return { ual: existingUal };
  }

  const maxAttempts = 4;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await daemonRequest(baseUrl, token, "/api/knowledge-assets", {
        method: "POST",
        body: JSON.stringify({
          contextGraphId,
          name,
          quads,
          finalize: true,
          alsoShareSwm: true,
        }),
      });
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      // The daemon's own words for "these quads are already stored": take the
      // UAL if the mint also completed, and otherwise go on to mint it.
      if (
        message.includes("unfinished promote") ||
        message.includes("already exists") ||
        message.includes("already published")
      ) {
        const recovered = await readMintedUal(
          baseUrl,
          token,
          contextGraphId,
          name
        );
        if (recovered) {
          return { ual: recovered };
        }
        lastError = undefined;
        break;
      }
      if (isUnknownAccessPolicyError(message) && attempt < maxAttempts) {
        await sleep(2000 * attempt);
        continue;
      }
      if (isUnknownAccessPolicyError(message)) {
        throw new Error(unknownAccessPolicyHint(contextGraphId), { cause: err });
      }
      throw err;
    }
  }
  if (lastError) {
    throw lastError;
  }

  const minted = await daemonRequest<{ ual?: string }>(
    baseUrl,
    token,
    `/api/knowledge-assets/${encodeURIComponent(name)}/vm/publish`,
    {
      method: "POST",
      body: JSON.stringify({ contextGraphId }),
    }
  );

  if (minted.ual) {
    return { ual: minted.ual };
  }

  const ual = await readMintedUal(baseUrl, token, contextGraphId, name);
  if (!ual) {
    throw new Error(
      `Publish completed but no UAL was returned for Knowledge Asset "${name}".`
    );
  }

  return { ual };
}

function isHttp404(err: unknown): boolean {
  return (
    err instanceof Error &&
    "httpStatus" in err &&
    (err as Error & { httpStatus?: number }).httpStatus === 404
  );
}

/**
 * Load assertion quads for a minted UAL.
 * Resolves the KA descriptor by UAL, then SPARQL-dumps its assertion graph.
 * HTTP 404 / missing graph / empty → []; other errors propagate.
 */
export async function getAssetQuadsByUal(
  baseUrl: string,
  token: string,
  targetUal: string,
  contextGraphId: string
): Promise<TargetAssetBinding[]> {
  const ual = targetUal.trim();
  if (!ual) {
    return [];
  }

  let descriptor: KnowledgeAssetDescriptor;
  try {
    descriptor = await daemonRequest<KnowledgeAssetDescriptor>(
      baseUrl,
      token,
      `/api/knowledge-assets/${encodeURIComponent(ual)}?${new URLSearchParams({
        contextGraphId,
      }).toString()}`,
      { method: "GET" }
    );
  } catch (err) {
    if (isHttp404(err)) {
      return [];
    }
    throw err;
  }

  const assertionGraph = descriptor.assertionGraph?.trim();
  if (!assertionGraph) {
    return [];
  }

  // assertionGraph is a daemon IRI; reject characters that break SPARQL GRAPH.
  if (/\s/.test(assertionGraph) || assertionGraph.includes(">")) {
    throw new Error(
      `Invalid assertionGraph for UAL ${ual}: ${JSON.stringify(assertionGraph)}`
    );
  }

  const { bindings } = await queryDaemon(
    baseUrl,
    token,
    `
      SELECT ?subject ?predicate ?object
      WHERE {
        GRAPH <${assertionGraph}> {
          ?subject ?predicate ?object .
        }
      }
    `,
    contextGraphId
  );

  return bindings.map((row) => ({
    subject: sparqlTermValue(row["subject"]),
    predicate: sparqlTermValue(row["predicate"]),
    object: sparqlTermValue(row["object"]),
  }));
}
