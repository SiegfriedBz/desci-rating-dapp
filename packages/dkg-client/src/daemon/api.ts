import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";
import { daemonRequest } from "./http.js";

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

export async function publishAssertion(
  baseUrl: string,
  token: string,
  contextGraphId: string,
  name: string,
  quads: KnowledgeAssetQuad[]
): Promise<{ ual: string }> {
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

  const ka = await daemonRequest<{ ual?: string; publishedUal?: string }>(
    baseUrl,
    token,
    `/api/knowledge-assets/${encodeURIComponent(name)}?${new URLSearchParams({
      contextGraphId,
    }).toString()}`
  );

  const ual = ka.ual ?? ka.publishedUal;
  if (!ual) {
    throw new Error(
      `Publish completed but no UAL was returned for Knowledge Asset "${name}".`
    );
  }

  return { ual };
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
