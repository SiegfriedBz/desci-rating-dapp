import type { KnowledgeAssetQuad } from "@desci/shared";
import { nquadIntegerLiteral, nquadStringLiteral } from "../helpers/nquads.js";
import {
  DESCI_MISSING_EVIDENCE,
  DESCI_OBSERVED_EVIDENCE,
  SCHEMA_ABOUT,
  SCHEMA_AUTHOR,
  SCHEMA_DESCRIPTION,
  SCHEMA_RATING_VALUE,
} from "../schema/vocab.js";

/** Drop blanks and the legacy `(none)` placeholder, then de-duplicate. */
function evidenceItems(items: readonly string[] | undefined): string[] {
  if (!items) {
    return [];
  }
  const seen = new Set<string>();
  for (const item of items) {
    const value = item.trim();
    if (value && value !== "(none)") {
      seen.add(value);
    }
  }
  return [...seen];
}

/**
 * Build schema.org rating quads for a Knowledge Asset assertion.
 * Predicates match {@link queryRatingsAbout} SPARQL (Action B).
 *
 * The four schema.org quads are the stable contract — `queryPublicationsWithRatings`
 * keys the catalog off `schema:about` + `schema:ratingValue`. The `desci:` evidence
 * quads are additive and repeatable, one per item.
 */
export function buildRatingGraph(input: {
  ratingSubject: string;
  targetUal: string;
  score: number;
  author: string;
  description: string;
  observed?: readonly string[];
  missing?: readonly string[];
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
    ...evidenceItems(input.observed).map((item) => ({
      subject: ratingSubject,
      predicate: DESCI_OBSERVED_EVIDENCE,
      object: nquadStringLiteral(item),
    })),
    ...evidenceItems(input.missing).map((item) => ({
      subject: ratingSubject,
      predicate: DESCI_MISSING_EVIDENCE,
      object: nquadStringLiteral(item),
    })),
  ];
}
