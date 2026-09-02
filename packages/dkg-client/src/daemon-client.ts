import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";

export type DaemonConnectConfig = {
  apiUrl?: string;
  authToken?: string;
};

export type DaemonClient = {
  baseUrl: string;
  ensureContextGraph: (id: string, name?: string) => Promise<void>;
  publishAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<{ ual: string }>;
  query: (
    sparql: string,
    contextGraphId: string
  ) => Promise<{ bindings: SparqlBindings }>;
};

type HttpError = Error & {
  httpStatus?: number;
  responseBody?: unknown;
};

function dkgHome(): string {
  return process.env["DKG_HOME"]?.trim() || join(homedir(), ".dkg");
}

async function readAuthToken(config: DaemonConnectConfig = {}): Promise<string> {
  const fromEnv = config.authToken?.trim() ?? process.env["DKG_AUTH_TOKEN"]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const tokenPath = join(dkgHome(), "auth.token");
  if (!existsSync(tokenPath)) {
    throw new Error(
      `Missing DKG auth token. Start the node with "pnpm dkg:start" or set DKG_AUTH_TOKEN.`
    );
  }

  const raw = await readFile(tokenPath, "utf-8");
  const token = raw
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("#"));

  if (!token) {
    throw new Error(`No bearer token found in ${tokenPath}`);
  }

  return token;
}

async function resolveApiBaseUrl(config: DaemonConnectConfig = {}): Promise<string> {
  const explicit =
    config.apiUrl?.trim() ?? process.env["DKG_API_URL"]?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const portFile = join(dkgHome(), "api.port");
  if (existsSync(portFile)) {
    const port = (await readFile(portFile, "utf-8")).trim();
    if (port) {
      return `http://127.0.0.1:${port}`;
    }
  }

  const configPath = join(dkgHome(), "config.json");
  if (existsSync(configPath)) {
    const config = JSON.parse(await readFile(configPath, "utf-8")) as {
      apiPort?: number;
    };
    if (config.apiPort) {
      return `http://127.0.0.1:${config.apiPort}`;
    }
  }

  const port = process.env["DKG_API_PORT"]?.trim() || "9200";
  return `http://127.0.0.1:${port}`;
}

function httpError(status: number, message: string, body?: unknown): HttpError {
  const err = new Error(message) as HttpError;
  err.httpStatus = status;
  err.responseBody = body;
  return err;
}

function errorMessageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") {
    return fallback;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.error === "string") {
    return record.error;
  }
  if (typeof record.message === "string") {
    return record.message;
  }
  return fallback;
}

async function daemonRequest<T>(
  baseUrl: string,
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new Error(
      'DKG daemon is not reachable. Start it with "pnpm dkg:start" and retry.'
    );
  }

  const body = await response.json().catch(() => ({
    error: response.statusText,
  }));

  if (!response.ok) {
    throw httpError(
      response.status,
      errorMessageFromBody(body, response.statusText),
      body
    );
  }

  return body as T;
}

async function ensureContextGraph(
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

async function publishAssertion(
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

async function queryDaemon(
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
