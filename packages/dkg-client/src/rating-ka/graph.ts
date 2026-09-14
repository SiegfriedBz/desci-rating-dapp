import type { KnowledgeAssetQuad } from "@desci/shared";
import { nquadIntegerLiteral, nquadStringLiteral } from "../helpers/nquads.js";
import {
  SCHEMA_ABOUT,
  SCHEMA_AUTHOR,
  SCHEMA_DESCRIPTION,
  SCHEMA_RATING_VALUE,
} from "../schema/vocab.js";

/**
 * Build schema.org rating quads for a Knowledge Asset assertion.
 * Predicates match {@link queryRatingsAbout} SPARQL (Action B).
 */
export function buildRatingGraph(input: {
  ratingSubject: string;
  targetUal: string;
  score: number;
  author: string;
  description: string;
}): KnowledgeAssetQuad[] {
  const { ratingSubject, targetUal, score, author, description } = input;
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
    {
      subject: ratingSubject,
      predicate: SCHEMA_DESCRIPTION,
      object: nquadStringLiteral(description),
    },
  ];
}
