import { randomUUID } from "node:crypto";
import type {
  KnowledgeAssetQuad,
  PublishRatingParams,
  PublishRatingResult,
} from "@desci/shared";
import {
  SCHEMA_ABOUT,
  SCHEMA_AUTHOR,
  SCHEMA_RATING_VALUE,
} from "./daemon/sparql.js";

const XSD_INTEGER = "http://www.w3.org/2001/XMLSchema#integer";

export function nquadStringLiteral(value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function nquadIntegerLiteral(value: number): string {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`rating score must be a finite integer, got ${value}`);
  }
  return `"${value}"^^${XSD_INTEGER}`;
}

/**
 * Build schema.org rating quads for a Knowledge Asset assertion.
 * Predicates match {@link fetchRatingsForAsset} SPARQL (Action B).
 */
export function buildRatingQuads(input: {
  ratingSubject: string;
  targetUal: string;
  score: number;
  author: string;
}): KnowledgeAssetQuad[] {
  const { ratingSubject, targetUal, score, author } = input;
  return [
    {
      subject: ratingSubject,
      predicate: SCHEMA_ABOUT,
      object: targetUal,
    },
    {
      subject: ratingSubject,
      predicate: SCHEMA_RATING_VALUE,
      object: nquadIntegerLiteral(score),
    },
    {
      subject: ratingSubject,
      predicate: SCHEMA_AUTHOR,
      object: nquadStringLiteral(author),
    },
  ];
}

export function createRatingIdentity(name?: string): {
  ratingSubject: string;
  name: string;
} {
  const uuid = randomUUID();
  return {
    ratingSubject: `urn:uuid:rating-${uuid}`,
    name: name?.trim() || `desci-rating-${uuid}`,
  };
}

export type PublishRatingDeps = {
  publishAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<{ ual: string }>;
};

/** Domain helper: mint an R-KA via the daemon publish path. */
export async function publishRatingAssertion(
  deps: PublishRatingDeps,
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
  const contextGraphId = params.contextGraphId.trim();
  if (!contextGraphId) {
    throw new Error("contextGraphId is required");
  }

  const { ratingSubject, name } = createRatingIdentity(params.name);
  const quads = buildRatingQuads({
    ratingSubject,
    targetUal,
    score: params.score,
    author,
  });

  const { ual } = await deps.publishAssertion(
    contextGraphId,
    name,
    quads
  );

  return { ual, ratingSubject, name };
}
