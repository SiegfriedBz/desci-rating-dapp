import type { KnowledgeAssetQuad } from "@desci/shared";
import {
  createPublicationIdentity,
  normalizeDoiIri,
} from "../helpers/index.js";
import type {
  PublishAssertionDeps,
  PublishPublicationParams,
  PublishPublicationResult,
  StoreAssertionDeps,
  StorePublicationResult,
} from "../schema/types.js";
import { buildPublicationGraph } from "./graph.js";

function preparePublicationKa(params: PublishPublicationParams): {
  contextGraphId: string;
  name: string;
  subjectUri: string;
  quads: KnowledgeAssetQuad[];
} {
  const contextGraphId = params.contextGraphId.trim();
  if (!contextGraphId) {
    throw new Error("contextGraphId is required");
  }

  const { name, fallbackSubjectUri } = createPublicationIdentity(params.name);
  const { quads, subjectUri } = buildPublicationGraph(params.meta, {
    subjectUri: normalizeDoiIri(params.meta.doi) || fallbackSubjectUri,
    creator: params.creator,
    dateCreated: params.dateCreated,
  });

  return { contextGraphId, name, subjectUri, quads };
}

/**
 * Domain helper: store a publication Target KA — build the graph, put it on the
 * node, stop. Returns the identity the mint half needs; nothing is on chain
 * yet, so there is no UAL.
 */
export async function storePublicationKa(
  deps: StoreAssertionDeps,
  params: PublishPublicationParams
): Promise<StorePublicationResult> {
  const { contextGraphId, name, subjectUri, quads } =
    preparePublicationKa(params);

  await deps.storeAssertion(contextGraphId, name, quads);
  return { name, subjectUri };
}

/** Domain helper: publish a publication Target KA — store, then mint. */
export async function publishPublicationKa(
  deps: PublishAssertionDeps,
  params: PublishPublicationParams
): Promise<PublishPublicationResult> {
  const { contextGraphId, name, subjectUri, quads } =
    preparePublicationKa(params);

  const { ual } = await deps.publishAssertion(contextGraphId, name, quads);
  return { ual, name, subjectUri };
}
