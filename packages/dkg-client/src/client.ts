import {
  BASE_SEPOLIA_CHAIN_ID,
  DEFAULT_ORIGINTRAIL_DKG_HUB_CONTRACT_ADDRESS_BASE_SEPOLIA,
  DkgConfig,
  KnowledgeAssetPublishResult,
  PublishAssetParams,
  PublishRatingParams,
  PublishRatingResult,
  SparqlBindings,
} from "@desci/shared";
import { connectDaemon } from "./daemon/index.js";
import { TargetAssetNotIndexedError } from "./errors.js";
import { publishPublicationKa } from "./publication-ka/index.js";
import type {
  PublishPublicationParams,
  PublishPublicationResult,
  RatingBinding,
  TargetAssetBinding,
} from "./schema/types.js";
import {
  publishRatingKa,
  queryRatingsAbout as queryRatingsAboutKa,
} from "./rating-ka/index.js";

export async function createDkgClient(config: DkgConfig = {}) {
  const daemon = await connectDaemon({
    apiUrl: config.apiUrl,
    authToken: config.authToken,
  });

  return Object.freeze({
    getChainId: () => BASE_SEPOLIA_CHAIN_ID,
    getHubAddress: () =>
      DEFAULT_ORIGINTRAIL_DKG_HUB_CONTRACT_ADDRESS_BASE_SEPOLIA,
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
    /** Look up the on-chain UAL for a Knowledge Asset by daemon name. */
    getAssetUal: async (
      name: string,
      contextGraphId: string
    ): Promise<string | null> => {
      return daemon.getAssetUal(contextGraphId, name);
    },
    publishRating: async (
      params: PublishRatingParams
    ): Promise<PublishRatingResult> => {
      return publishRatingKa(
        { publishAssertion: daemon.publishAssertion },
        params
      );
    },
    publishPublication: async (
      params: PublishPublicationParams
    ): Promise<PublishPublicationResult> => {
      return publishPublicationKa(
        { publishAssertion: daemon.publishAssertion },
        params
      );
    },
    query: async (
      sparql: string,
      contextGraphId: string
    ): Promise<{ bindings: SparqlBindings }> => {
      return daemon.query(sparql, contextGraphId);
    },
    /**
     * Load the Knowledge Asset assertion for a published UAL.
     * Resolves the KA via the daemon identifier API, then dumps its assertion
     * graph. Empty/404 → TargetAssetNotIndexedError.
     */
    getAssetQuadsByUal: async (
      targetUal: string,
      contextGraphId: string
    ): Promise<{ bindings: TargetAssetBinding[] }> => {
      const bindings = await daemon.getAssetQuadsByUal(
        targetUal,
        contextGraphId
      );
      if (bindings.length === 0) {
        throw new TargetAssetNotIndexedError(targetUal);
      }
      return { bindings };
    },
    queryRatingsAbout: async (
      targetUal: string,
      contextGraphId: string
    ): Promise<{ bindings: RatingBinding[] }> => {
      return queryRatingsAboutKa(daemon.query, targetUal, contextGraphId);
    },
    stop: async () => {
      // Local daemon lifecycle is managed by `pnpm dkg:start` / `dkg stop`.
    },
  });
}

export type DkgClient = Awaited<ReturnType<typeof createDkgClient>>;
