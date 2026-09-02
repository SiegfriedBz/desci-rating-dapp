import type { KnowledgeAssetQuad, SparqlBindings } from "@desci/shared";

export type DaemonConnectConfig = {
  apiUrl?: string;
  authToken?: string;
};

export type DaemonClient = {
  baseUrl: string;
  ensureContextGraph: (id: string, name?: string) => Promise<void>;
  publishAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<{ ual: string }>;
  query: (
    sparql: string,
    contextGraphId: string
  ) => Promise<{ bindings: SparqlBindings }>;
};
