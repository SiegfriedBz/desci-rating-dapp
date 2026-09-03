import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";

export type DaemonConnectConfig = {
  apiUrl?: string;
  authToken?: string;
};

export type AssetQuadBinding = {
  subject: string;
  predicate: string;
  object: string;
};

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
  ) => Promise<AssetQuadBinding[]>;
  query: (
    sparql: string,
    contextGraphId: string
  ) => Promise<{ bindings: SparqlBindings }>;
};
