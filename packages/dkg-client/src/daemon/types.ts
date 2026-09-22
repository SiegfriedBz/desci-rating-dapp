import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";
import type { TargetAssetBinding } from "../schema/types.js";
import type { KnowledgeAssetState } from "./api/assets.js";
import type { SparqlQueryOptions } from "./api/query.js";

export type { KnowledgeAssetState, SparqlQueryOptions };

export type DaemonConnectConfig = {
  apiUrl?: string;
  authToken?: string;
};

/** Alias of TargetAssetBinding for daemon-layer callers. */
export type AssetQuadBinding = TargetAssetBinding;

export type DaemonClient = {
  baseUrl: string;
  ensureContextGraph: (id: string, name?: string) => Promise<void>;
  /** Store half: quads onto the node, no UAL yet. */
  storeAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<void>;
  /** Mint half: anchor the NFT for an already-stored name. */
  mintAssertion: (
    contextGraphId: string,
    name: string
  ) => Promise<{ ual: string }>;
  /** Both halves in order, for callers with no step boundary between them. */
  publishAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<{ ual: string }>;
  /** Where a name sits in the store → mint lifecycle. */
  readKnowledgeAssetState: (
    contextGraphId: string,
    name: string
  ) => Promise<KnowledgeAssetState>;
  /** Resolve the minted UAL for a Knowledge Asset name, or null if not minted. */
  getMintedUal: (
    contextGraphId: string,
    name: string
  ) => Promise<string | null>;
  /** Resolve KA by UAL, then dump its assertion-graph quads (empty if not indexed). */
  getAssetQuadsByUal: (
    targetUal: string,
    contextGraphId: string
  ) => Promise<TargetAssetBinding[]>;
  query: (
    sparql: string,
    contextGraphId: string,
    options?: SparqlQueryOptions
  ) => Promise<{ bindings: SparqlBindings }>;
};
