import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";
import { daemonRequest } from "./http.js";
import type { AssetQuadBinding } from "./types.js";

export async function ensureContextGraph(
  baseUrl: string,
  token: string,
  id: string,
  name?: string
): Promise<void> {
  try {
    await daemonRequest(baseUrl, token, "/api/context-graph/create", {
      method: "POST",
      body: JSON.stringify({
        id,
        name: name ?? id,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("already exists")) {
      return;
    }
    throw err;
  }
}

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
  } catch (err) {
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
    throw err;
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

function termString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  return String(value);
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
): Promise<AssetQuadBinding[]> {
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
    subject: termString(row["subject"]),
    predicate: termString(row["predicate"]),
    object: termString(row["object"]),
  }));
}

export async function queryDaemon(
  baseUrl: string,
  token: string,
  sparql: string,
  contextGraphId: string
): Promise<{ bindings: SparqlBindings }> {
  const result = await daemonRequest<{
    type?: string;
    bindings?: SparqlBindings;
    result?: { bindings?: SparqlBindings };
  }>(baseUrl, token, "/api/query", {
    method: "POST",
    body: JSON.stringify({ sparql, contextGraphId }),
  });

  if (result.type === "bindings" && Array.isArray(result.bindings)) {
    return { bindings: result.bindings };
  }

  if (Array.isArray(result.result?.bindings)) {
    return { bindings: result.result.bindings };
  }

  if (Array.isArray(result.bindings)) {
    return { bindings: result.bindings };
  }

  return { bindings: [] };
}
