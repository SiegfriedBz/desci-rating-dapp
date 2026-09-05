import type { SparqlBindings } from "@desci/shared";
import { daemonRequest } from "../http.js";

export type SparqlQueryOptions = {
  graphSuffix?: string;
  view?: "working-memory" | "shared-working-memory" | "verifiable-memory";
};

export async function queryDaemon(
  baseUrl: string,
  token: string,
  sparql: string,
  contextGraphId: string,
  options?: SparqlQueryOptions
): Promise<{ bindings: SparqlBindings }> {
  const result = await daemonRequest<{
    type?: string;
    bindings?: SparqlBindings;
    result?: { bindings?: SparqlBindings };
  }>(baseUrl, token, "/api/query", {
    method: "POST",
    body: JSON.stringify({
      sparql,
      contextGraphId,
      ...(options?.graphSuffix ? { graphSuffix: options.graphSuffix } : {}),
      ...(options?.view ? { view: options.view } : {}),
    }),
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
