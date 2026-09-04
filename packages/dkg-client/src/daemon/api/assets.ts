import type { KnowledgeAssetQuad } from "@desci/shared";
import { sparqlTermValue } from "../../helpers/sparql.js";
import type { TargetAssetBinding } from "../../schema/types.js";
import { daemonRequest } from "../http.js";
import { queryDaemon } from "./query.js";

export async function readPublishedUal(
  baseUrl: string,
  token: string,
  contextGraphId: string,
  name: string
): Promise<string | null> {
  try {
    const ka = await daemonRequest<{
      ual?: string;
      publishedUal?: string;
      reservedUal?: string;
    }>(
      baseUrl,
      token,
      `/api/knowledge-assets/${encodeURIComponent(name)}?${new URLSearchParams({
        contextGraphId,
      }).toString()}`
    );
    return ka.ual ?? ka.publishedUal ?? ka.reservedUal ?? null;
  } catch {
    return null;
  }
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
  const existingUal = await readPublishedUal(baseUrl, token, contextGraphId, name);
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
      // Stuck mid-promote / already finalized: recover by reading current UAL.
      if (
        message.includes("unfinished promote") ||
        message.includes("already exists") ||
        message.includes("already published")
      ) {
        const recovered = await readPublishedUal(
          baseUrl,
          token,
          contextGraphId,
          name
        );
        if (recovered) {
          return { ual: recovered };
        }
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

  const published = await daemonRequest<{ ual?: string }>(
    baseUrl,
    token,
    `/api/knowledge-assets/${encodeURIComponent(name)}/vm/publish`,
    {
      method: "POST",
      body: JSON.stringify({ contextGraphId }),
    }
  );

  if (published.ual) {
    return { ual: published.ual };
  }

  const ual = await readPublishedUal(baseUrl, token, contextGraphId, name);
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

type KaDescriptor = {
  name?: string;
  assertionGraph?: string;
  ual?: string;
  publishedUal?: string;
};

/**
 * Load assertion quads for a published UAL.
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

  let descriptor: KaDescriptor;
  try {
    descriptor = await daemonRequest<KaDescriptor>(
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
