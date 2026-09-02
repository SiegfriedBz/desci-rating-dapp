import {
  BASE_SEPOLIA_CHAIN_ID,
  DEFAULT_BASE_SEPOLIA_HUB_ADDRESS,
  DkgConfig,
  KnowledgeAssetPublishResult,
  PublishAssetParams,
  SparqlBindings,
} from "@desci/shared";
import { connectDaemon } from "./daemon-client.js";

export async function createDkgClient(config: DkgConfig = {}) {
  const daemon = await connectDaemon({
    apiUrl: config.apiUrl,
    authToken: config.authToken,
  });

  return Object.freeze({
    getChainId: () => BASE_SEPOLIA_CHAIN_ID,
    getHubAddress: () => DEFAULT_BASE_SEPOLIA_HUB_ADDRESS,
    getApiBaseUrl: () => daemon.baseUrl,
    ensureContextGraph: async (id: string, name?: string) => {
      await daemon.ensureContextGraph(id, name);
    },
    publishAsset: async (
      params: PublishAssetParams
    ): Promise<KnowledgeAssetPublishResult> => {
      return daemon.publishAssertion(
        params.contextGraphId,
        params.name,
        params.quads
      );
    },
    query: async (
      sparql: string,
      contextGraphId: string
    ): Promise<{ bindings: SparqlBindings }> => {
      return daemon.query(sparql, contextGraphId);
    },
    stop: async () => {
      // Local daemon lifecycle is managed by `pnpm dkg:start` / `dkg stop`.
    },
  });
}

export type DkgClient = Awaited<ReturnType<typeof createDkgClient>>;
