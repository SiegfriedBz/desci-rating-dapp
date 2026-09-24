export const BASE_SEPOLIA_CHAIN_ID = 84532;

/** OriginTrail DKG Hub contract on Base Sepolia (chain id 84532). */
export const DEFAULT_ORIGINTRAIL_DKG_HUB_CONTRACT_ADDRESS_BASE_SEPOLIA =
  "0xC056e67Da4F51377Ad1B01f50F655fFdcCD809F6";

/**
 * On-chain RatingController.Phase enum values (ABI returns uint8).
 * Prefer `as const` over TS enum: no double-mapping, tree-shakeable.
 */
export const RATING_PHASE = {
  Unrated: 0,
  Phase1Completed: 1,
  Phase2Completed: 2,
  Phase3Completed: 3,
} as const;

/**
 * Inngest step id for the mint half of a publish. Shared because a failure
 * naming this step is the one case where the KA is already stored on the
 * daemon and only the NFT is missing, which the web app has to recognise to
 * avoid telling the user to upload the paper a second time.
 */
export const DKG_MINT_TARGET_KA_STEP = "dkg-mint-target-ka";

/**
 * Tokens the DKG daemon puts in a write it could not get quorum for. Matched
 * against the message because the daemon reports this as prose inside an
 * ordinary failure and gives it no code of its own: `storage_ack_insufficient`
 * and the `QuorumUnmetError` summary are the only stable strings in it.
 */
const QUORUM_FAILURE_MARKERS = ["storage_ack_insufficient", "QuorumUnmetError"];

/**
 * True when the DKG network declined a write rather than the write being
 * wrong. Peers answer `CORE_TEMPORARILY_UNAVAILABLE` or time out, which
 * describes the network at that moment and says nothing about the payload — so
 * it is worth waiting and retrying, and it is never worth publishing again.
 */
export function isQuorumFailure(error: string | null | undefined): boolean {
  if (!error) {
    return false;
  }
  return QUORUM_FAILURE_MARKERS.some((marker) => error.includes(marker));
}

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

/** Mint half of a publish. No quads: the assertion is already on the node. */
export type MintAssetParams = {
  contextGraphId: string;
  /** Named Knowledge Asset within the context graph. */
  name: string;
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
  /** Rigor signals found, one `desci:observedEvidence` literal each. */
  observed?: readonly string[];
  /** Rigor signals expected but absent, one `desci:missingEvidence` literal each. */
  missing?: readonly string[];
  /** Named KA within the context graph; defaults to a unique `desci-rating-*` id. */
  name?: string;
};

export type PublishRatingResult = KnowledgeAssetPublishResult & {
  /** Local RDF subject IRI of the rating assertion. */
  ratingSubject: string;
  /** Daemon Knowledge Asset name used for publish. */
  name: string;
};

/**
 * An R-KA whose quads are on the node and whose NFT is not. No `ual` — nothing
 * is anchored yet. `ratingSubject` is a fresh UUID generated with the graph, so
 * whoever mints has to carry it across rather than derive it from the name.
 */
export type StoreRatingResult = {
  ratingSubject: string;
  name: string;
};
