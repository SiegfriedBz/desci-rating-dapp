import {
  ensureContextGraph,
  publishAssertion,
  queryDaemon,
} from "./api.js";
import { readAuthToken, resolveApiBaseUrl } from "./config.js";
import { daemonRequest } from "./http.js";
import type { DaemonClient, DaemonConnectConfig } from "./types.js";

export async function connectDaemon(
  config: DaemonConnectConfig = {}
): Promise<DaemonClient> {
  const [baseUrl, token] = await Promise.all([
    resolveApiBaseUrl(config),
    readAuthToken(config),
  ]);

  await daemonRequest(baseUrl, token, "/api/status", {
    method: "GET",
  });

  return {
    baseUrl,
    ensureContextGraph: (id, name) =>
      ensureContextGraph(baseUrl, token, id, name),
    publishAssertion: (contextGraphId, name, quads) =>
      publishAssertion(baseUrl, token, contextGraphId, name, quads),
    query: (sparql, contextGraphId) =>
      queryDaemon(baseUrl, token, sparql, contextGraphId),
  };
}
