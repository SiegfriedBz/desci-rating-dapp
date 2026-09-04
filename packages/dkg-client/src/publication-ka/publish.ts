import {
  createPublicationIdentity,
  normalizeDoiIri,
} from "../helpers/index.js";
import type {
  PublishAssertionDeps,
  PublishPublicationParams,
  PublishPublicationResult,
} from "../schema/types.js";
import { buildPublicationGraph } from "./graph.js";

/** Domain helper: mint a publication Target KA via the daemon publish path. */
export async function publishPublicationKa(
  deps: PublishAssertionDeps,
  params: PublishPublicationParams
): Promise<PublishPublicationResult> {
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

  const { ual } = await deps.publishAssertion(contextGraphId, name, quads);
  return { ual, name, subjectUri };
}
