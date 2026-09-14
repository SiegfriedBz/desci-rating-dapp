import { daemonRequest } from "./http.js";
import { readAuthToken, resolveApiBaseUrl } from "./config.js";
import type { DaemonConnectConfig } from "./types.js";

export type DkgProbeResult =
  | { ok: true; apiUrl: string }
  | { ok: false; reason: string };

/**
 * Single-shot DKG daemon health check (no multi-second ready retries).
 * Safe for SSR / Vercel preview — never throws for missing auth or unreachable host.
 */
export async function probeDkgDaemon(
  config: DaemonConnectConfig = {}
): Promise<DkgProbeResult> {
  let apiUrl: string;
  let token: string;
  try {
    [apiUrl, token] = await Promise.all([
      resolveApiBaseUrl(config),
      readAuthToken(config),
    ]);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    await daemonRequest(apiUrl, token, "/api/status", { method: "GET" });
    return { ok: true, apiUrl };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
