import {
  ensureContextGraph,
  getAssetQuadsByUal,
  publishAssertion,
  queryDaemon,
  readPublishedUal,
} from "./api/index.js";
import { readAuthToken, resolveApiBaseUrl } from "./config.js";
import { daemonRequest } from "./http.js";
import type { DaemonClient, DaemonConnectConfig } from "./types.js";

function isUnreachableError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.message.includes("DKG daemon is not reachable")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * `dkg start` returns before the HTTP API binds. Retry /api/status briefly so
 * scripts that chain start → publish do not fail with a false "not reachable".
 */
async function waitForDaemonReady(
  baseUrl: string,
  token: string
): Promise<void> {
  const delaysMs = [0, 500, 1000, 2000, 2000, 3000, 4000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    const delay = delaysMs[attempt] ?? 0;
    if (delay > 0) {
      await sleep(delay);
    }
    try {
      await daemonRequest(baseUrl, token, "/api/status", { method: "GET" });
      return;
    } catch (err) {
      lastErr = err;
      if (!isUnreachableError(err)) {
        throw err;
      }
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(
        'DKG daemon is not reachable. Start it with "pnpm dkg:start" and retry.'
      );
}

export async function connectDaemon(
  config: DaemonConnectConfig = {}
): Promise<DaemonClient> {
  const [baseUrl, token] = await Promise.all([
    resolveApiBaseUrl(config),
    readAuthToken(config),
  ]);

  await waitForDaemonReady(baseUrl, token);

  return {
    baseUrl,
    ensureContextGraph: (id, name) =>
      ensureContextGraph(baseUrl, token, id, name),
    publishAssertion: (contextGraphId, name, quads) =>
      publishAssertion(baseUrl, token, contextGraphId, name, quads),
    getAssetUal: (contextGraphId, name) =>
      readPublishedUal(baseUrl, token, contextGraphId, name),
    getAssetQuadsByUal: (targetUal, contextGraphId) =>
      getAssetQuadsByUal(baseUrl, token, targetUal, contextGraphId),
    query: (sparql, contextGraphId, options) =>
      queryDaemon(baseUrl, token, sparql, contextGraphId, options),
  };
}
