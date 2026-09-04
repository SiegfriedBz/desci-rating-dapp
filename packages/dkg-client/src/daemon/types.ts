import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";
import type { TargetAssetBinding } from "../schema/types.js";

export type DaemonConnectConfig = {
  apiUrl?: string;
  authToken?: string;
};

/** Alias of TargetAssetBinding for daemon-layer callers. */
export type AssetQuadBinding = TargetAssetBinding;

export type DaemonClient = {
  baseUrl: string;
  ensureContextGraph: (id: string, name?: string) => Promise<void>;
  publishAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<{ ual: string }>;
  /** Resolve published UAL for a Knowledge Asset name, or null if missing. */
  getAssetUal: (
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
    contextGraphId: string
  ) => Promise<{ bindings: SparqlBindings }>;
};
