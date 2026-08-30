import { BASE_SEPOLIA_CHAIN_ID } from "@desci/shared";

export interface DkgConfig {
  chainId?: number;
  endpoint?: string;
}

export function createDkgClient(config: DkgConfig = {}) {
  const chainId = config.chainId ?? BASE_SEPOLIA_CHAIN_ID;
  const endpoint = config.endpoint ?? "http://localhost:8900";

  return {
    getChainId: () => chainId,
    getEndpoint: () => endpoint,
  };
}

export type DkgClient = ReturnType<typeof createDkgClient>;