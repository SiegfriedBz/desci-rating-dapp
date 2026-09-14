import type {
  PublishRatingParams,
  PublishRatingResult,
} from "@desci/shared";
import { createRatingIdentity } from "../helpers/identity.js";
import type { PublishAssertionDeps } from "../schema/types.js";
import { buildRatingGraph } from "./graph.js";

/** Domain helper: mint an R-KA via the daemon publish path. */
export async function publishRatingKa(
  deps: PublishAssertionDeps,
  params: PublishRatingParams
): Promise<PublishRatingResult> {
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
  });

  const { ual } = await deps.publishAssertion(contextGraphId, name, quads);

  return { ual, ratingSubject, name };
}
