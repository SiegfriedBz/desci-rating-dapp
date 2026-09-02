import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DaemonConnectConfig } from "./types.js";

function dkgHome(): string {
  return process.env["DKG_HOME"]?.trim() || join(homedir(), ".dkg");
}

export async function readAuthToken(
  config: DaemonConnectConfig = {}
): Promise<string> {
  const fromEnv =
    config.authToken?.trim() ?? process.env["DKG_AUTH_TOKEN"]?.trim();
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

export async function resolveApiBaseUrl(
  config: DaemonConnectConfig = {}
): Promise<string> {
  const explicit = config.apiUrl?.trim() ?? process.env["DKG_API_URL"]?.trim();
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
    const daemonConfig = JSON.parse(await readFile(configPath, "utf-8")) as {
      apiPort?: number;
    };
    if (daemonConfig.apiPort) {
      return `http://127.0.0.1:${daemonConfig.apiPort}`;
    }
  }

  const port = process.env["DKG_API_PORT"]?.trim() || "9200";
  return `http://127.0.0.1:${port}`;
}
