import {
  BASE_SEPOLIA_CHAIN_ID,
  DEFAULT_BASE_SEPOLIA_HUB_ADDRESS,
  DkgConfig,
  KnowledgeAssetPublishResult,
  PublishAssetParams,
  PublishRatingParams,
  PublishRatingResult,
  SparqlBindings,
} from "@desci/shared";
import { connectDaemon } from "./daemon/index.js";
import {
  SCHEMA_ABOUT,
  SCHEMA_AUTHOR,
  SCHEMA_RATING_VALUE,
  sparqlIri,
  sparqlTermValue,
} from "./daemon/sparql.js";
import { publishRatingAssertion } from "./ratings.js";

export type { PublishRatingParams, PublishRatingResult } from "@desci/shared";

export type TargetAssetBinding = {
  subject: string;
  predicate: string;
  object: string;
};

export type RatingBinding = {
  ratingSubject: string;
  ratingValue: string;
  author: string;
};

/** Thrown when the daemon has no quads for a target UAL (retriable). */
export class TargetAssetNotIndexedError extends Error {
  readonly code = "TargetAssetNotIndexed" as const;

  constructor(targetUal: string) {
    super(`TargetAssetNotIndexed: no triples found for ${targetUal}`);
    this.name = "TargetAssetNotIndexedError";
  }
}

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
      return publishRatingAssertion(
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
    fetchRatingsForAsset: async (
      targetUal: string,
      contextGraphId: string
    ): Promise<{ bindings: RatingBinding[] }> => {
      const about = sparqlIri(SCHEMA_ABOUT);
      const ratingValue = sparqlIri(SCHEMA_RATING_VALUE);
      const author = sparqlIri(SCHEMA_AUTHOR);
      const target = sparqlIri(targetUal);
      const sparql = `
        SELECT ?ratingSubject ?ratingValue ?author
        WHERE {
          ?ratingSubject ${about} ${target} ;
                         ${ratingValue} ?ratingValue ;
                         ${author} ?author .
        }
      `;
      const { bindings } = await daemon.query(sparql, contextGraphId);
      return {
        bindings: bindings.map((row) => ({
          ratingSubject: sparqlTermValue(row["ratingSubject"]),
          ratingValue: sparqlTermValue(row["ratingValue"]),
          author: sparqlTermValue(row["author"]),
        })),
      };
    },
    stop: async () => {
      // Local daemon lifecycle is managed by `pnpm dkg:start` / `dkg stop`.
    },
  });
}

export type DkgClient = Awaited<ReturnType<typeof createDkgClient>>;
