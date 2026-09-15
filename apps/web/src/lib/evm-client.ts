import "server-only";

import { env } from "@desci/env";
import { createPublicClient, http, type PublicClient } from "viem";
import { baseSepolia } from "viem/chains";

type EvmClient = PublicClient<ReturnType<typeof http>, typeof baseSepolia>;

let cached: EvmClient | undefined;

/**
 * Shared viem public client for server-side Base Sepolia reads.
 * Lazy so importing this module does not require RPC until first use.
 * RPC URL stays server-only — never expose it to the browser.
 */
export function getEvmClient(): EvmClient {
  if (!cached) {
    cached = createPublicClient({
      chain: baseSepolia,
      transport: http(env.BASE_SEPOLIA_RPC_URL),
    });
  }
  return cached;
}
