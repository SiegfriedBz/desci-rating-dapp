import {
  BASE_SEPOLIA_CHAIN_ID,
  DEFAULT_BASE_SEPOLIA_HUB_ADDRESS,
  DkgConfig,
  KnowledgeAssetPublishResult,
  PublishAssetParams,
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

export type TargetAssetBinding = {
  p: string;
  o: string;
};

export type RatingBinding = {
  ratingSubject: string;
  ratingValue: string;
  author: string;
};

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
    fetchTargetAsset: async (
      targetIri: string,
      contextGraphId: string
    ): Promise<{ bindings: TargetAssetBinding[] }> => {
      const subject = sparqlIri(targetIri);
      const sparql = `
        SELECT ?p ?o
        WHERE {
          ${subject} ?p ?o .
        }
        LIMIT 50
      `;
      const { bindings } = await daemon.query(sparql, contextGraphId);
      return {
        bindings: bindings.map((row) => ({
          p: sparqlTermValue(row["p"]),
          o: sparqlTermValue(row["o"]),
        })),
      };
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
