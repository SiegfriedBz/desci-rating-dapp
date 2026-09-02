export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const DEFAULT_BASE_SEPOLIA_HUB_ADDRESS =
  "0xC056e67Da4F51377Ad1B01f50F655fFdcCD809F6";

export type RatingMetadata = {
  targetUal: string;
  score: number;
  methodology: string;
  timestamp: number;
  evaluator: string;
};

export type KnowledgeAssetQuad = {
  subject: string;
  predicate: string;
  object: string;
  graph?: string;
};

export type DkgConfig = {
  /** Override daemon base URL, e.g. http://127.0.0.1:9200 */
  apiUrl?: string;
  /** Bearer token; defaults to ~/.dkg/auth.token */
  authToken?: string;
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
