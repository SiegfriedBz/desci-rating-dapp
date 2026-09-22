import type {
  KnowledgeAssetQuad,
  PublishRatingParams,
  PublishRatingResult,
  StoreRatingResult,
} from "@desci/shared";
import { createRatingIdentity } from "../helpers/identity.js";
import type {
  PublishAssertionDeps,
  StoreAssertionDeps,
} from "../schema/types.js";
import { buildRatingGraph } from "./graph.js";

function prepareRatingKa(params: PublishRatingParams): {
  contextGraphId: string;
  name: string;
  ratingSubject: string;
  quads: KnowledgeAssetQuad[];
} {
  const targetUal = params.targetUal.trim();
  if (!targetUal) {
    throw new Error("targetUal is required");
  }
  const author = params.author.trim();
  if (!author) {
    throw new Error("author is required");
  }
  const description = params.description.trim();
  if (!description) {
    throw new Error("description is required");
  }
  const contextGraphId = params.contextGraphId.trim();
  if (!contextGraphId) {
    throw new Error("contextGraphId is required");
  }

  const { ratingSubject, name } = createRatingIdentity(params.name);
  const quads = buildRatingGraph({
    ratingSubject,
    targetUal,
    score: params.score,
    author,
    description,
    observed: params.observed,
    missing: params.missing,
  });

  return { contextGraphId, name, ratingSubject, quads };
}

/**
 * Domain helper: store an R-KA — build the graph, put it on the node, stop.
 * Returns the identity the mint half needs; nothing is on chain yet, so there
 * is no UAL.
 */
export async function storeRatingKa(
  deps: StoreAssertionDeps,
  params: PublishRatingParams
): Promise<StoreRatingResult> {
  const { contextGraphId, name, ratingSubject, quads } =
    prepareRatingKa(params);

  await deps.storeAssertion(contextGraphId, name, quads);
  return { ratingSubject, name };
}

/** Domain helper: publish an R-KA — store, then mint. */
export async function publishRatingKa(
  deps: PublishAssertionDeps,
  params: PublishRatingParams
): Promise<PublishRatingResult> {
  const { contextGraphId, name, ratingSubject, quads } =
    prepareRatingKa(params);

  const { ual } = await deps.publishAssertion(contextGraphId, name, quads);

  return { ual, ratingSubject, name };
}
