export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** OriginTrail DKG Hub contract on Base Sepolia (chain id 84532). */
export const DEFAULT_ORIGINTRAIL_DKG_HUB_CONTRACT_ADDRESS_BASE_SEPOLIA =
  "0xC056e67Da4F51377Ad1B01f50F655fFdcCD809F6";

export type DkgConfig = {
  /** Override daemon base URL, e.g. http://127.0.0.1:9200 */
  apiUrl?: string;
  /** Bearer token; defaults to ~/.dkg/auth.token */
  authToken?: string;
};

export type KnowledgeAssetQuad = {
  subject: string;
  predicate: string;
  object: string;
  graph?: string;
};

export type PublishAssetParams = {
  contextGraphId: string;
  /** Named Knowledge Asset within the context graph. */
  name: string;
  quads: KnowledgeAssetQuad[];
};

export type KnowledgeAssetPublishResult = {
  ual: string;
};

export type SparqlBindings = Record<string, string>[];

/** Mint a Phase-1 rating Knowledge Asset (R-KA) linked to a target publication UAL. */
export type PublishRatingParams = {
  contextGraphId: string;
  /** Target publication UAL (schema:about object). */
  targetUal: string;
  score: number;
  author: string;
  /** Phase-1 verdict prose stored as schema:description on the R-KA. */
  description: string;
  /** Named KA within the context graph; defaults to a unique `desci-rating-*` id. */
  name?: string;
};

export type PublishRatingResult = KnowledgeAssetPublishResult & {
  /** Local RDF subject IRI of the rating assertion. */
  ratingSubject: string;
  /** Daemon Knowledge Asset name used for publish. */
  name: string;
};
