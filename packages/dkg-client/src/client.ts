import {
  BASE_SEPOLIA_CHAIN_ID,
  DEFAULT_ORIGINTRAIL_DKG_HUB_CONTRACT_ADDRESS_BASE_SEPOLIA,
  DkgConfig,
  KnowledgeAssetPublishResult,
  MintAssetParams,
  PublishAssetParams,
  PublishRatingParams,
  PublishRatingResult,
  SparqlBindings,
  StoreRatingResult,
} from "@desci/shared";
import { connectDaemon } from "./daemon/index.js";
import type {
  KnowledgeAssetState,
  SparqlQueryOptions,
} from "./daemon/types.js";
import { TargetAssetNotIndexedError } from "./errors.js";
import {
  publishPublicationKa,
  storePublicationKa,
} from "./publication-ka/index.js";
import type {
  PublishPublicationParams,
  PublishPublicationResult,
  RatingBinding,
  StorePublicationResult,
  TargetAssetBinding,
} from "./schema/types.js";
import {
  publishRatingKa,
  queryRatingsAbout as queryRatingsAboutKa,
  storeRatingKa,
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
    /** Store half: quads onto the node. No UAL exists until `mintAsset`. */
    storeAsset: async (params: PublishAssetParams): Promise<void> => {
      await daemon.storeAssertion(
        params.contextGraphId,
        params.name,
        params.quads
      );
    },
    /**
     * Mint half: anchor the NFT for a name this client already stored.
     * One method for every kind of Knowledge Asset, because minting acts on the
     * name — the publication / rating distinction lives in the quads, and those
     * are on the node by now.
     */
    mintAsset: async (
      params: MintAssetParams
    ): Promise<KnowledgeAssetPublishResult> => {
      return daemon.mintAssertion(params.contextGraphId, params.name);
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
    /** Where a Knowledge Asset name sits in the store → mint lifecycle. */
    readAssetState: async (
      name: string,
      contextGraphId: string
    ): Promise<KnowledgeAssetState> => {
      return daemon.readKnowledgeAssetState(contextGraphId, name);
    },
    /** Look up the minted (on-chain) UAL for a Knowledge Asset by daemon name. */
    getMintedUal: async (
      name: string,
      contextGraphId: string
    ): Promise<string | null> => {
      return daemon.getMintedUal(contextGraphId, name);
    },
    storeRating: async (
      params: PublishRatingParams
    ): Promise<StoreRatingResult> => {
      return storeRatingKa({ storeAssertion: daemon.storeAssertion }, params);
    },
    publishRating: async (
      params: PublishRatingParams
    ): Promise<PublishRatingResult> => {
      return publishRatingKa(
        { publishAssertion: daemon.publishAssertion },
        params
      );
    },
    storePublication: async (
      params: PublishPublicationParams
    ): Promise<StorePublicationResult> => {
      return storePublicationKa(
        { storeAssertion: daemon.storeAssertion },
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
      contextGraphId: string,
      options?: SparqlQueryOptions
    ): Promise<{ bindings: SparqlBindings }> => {
      return daemon.query(sparql, contextGraphId, options);
    },
    /**
     * Load the Knowledge Asset assertion for a minted UAL.
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
