import { daemonRequest } from "../http.js";

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
