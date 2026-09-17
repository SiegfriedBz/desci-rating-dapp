import type { SparqlBindings } from "@desci/shared";
import { literalLexicalForm } from "../helpers/nquads.js";
import { sparqlIri, sparqlTermOrNull } from "../helpers/sparql.js";
import {
  publicationWithRatingBindingSchema,
  type PublicationWithRatingBinding,
} from "../schema/types.js";
import { ualFromVerifiableMemoryGraphIri } from "../schema/ual.js";
import {
  RDF_TYPE,
  SCHEMA_ABOUT,
  SCHEMA_NAME,
  SCHEMA_RATING_VALUE,
  SCHEMA_SCHOLARLY_ARTICLE,
} from "../schema/vocab.js";

/** Optional daemon query knobs (DKG `/api/query` body fields). */
export type SparqlQueryOptions = {
  /** e.g. `"_meta"` to read the context-graph metadata partition. */
  graphSuffix?: string;
  view?: "working-memory" | "shared-working-memory" | "verifiable-memory";
};

export type SparqlQueryFn = (
  sparql: string,
  contextGraphId: string,
  options?: SparqlQueryOptions
) => Promise<{ bindings: SparqlBindings }>;

/**
 * List ScholarlyArticle publications with resolved KA UALs and optional ratings.
 *
 * Each on-chain KA (NFT token / VM graph) is its own catalog row. Do **not**
 * collapse by DOI/`subjectUri` — republishing the same paper mints a new UAL
 * and ratings `schema:about` that specific UAL.
 *
 * R-KA graphs (from the rating query) are excluded so a rating mint never
 * appears as a publication row.
 *
 * Ratings collapse to one per publication, newest token id winning. Normally
 * there is only one: `RatingController` refuses a second `requestPhase1` once
 * a UAL is rated, and `phase1-requested` names the mint after the request so
 * its retries reuse it. The edge case that needs the tie-break is a run that
 * minted but died before `fulfillPhase1` — clearing the lock with
 * `cancelPendingRequest` and requesting again mints a second R-KA, and only
 * that newer one is recorded on chain.
 */
export async function queryPublicationsWithRatings(
  query: SparqlQueryFn,
  contextGraphId: string
): Promise<{ bindings: PublicationWithRatingBinding[] }> {
  const rdfType = sparqlIri(RDF_TYPE);
  const scholarlyArticle = sparqlIri(SCHEMA_SCHOLARLY_ARTICLE);
  const name = sparqlIri(SCHEMA_NAME);
  const about = sparqlIri(SCHEMA_ABOUT);
  const ratingValuePred = sparqlIri(SCHEMA_RATING_VALUE);

  const pubSparql = `
    SELECT DISTINCT ?g ?subjectUri ?title
    WHERE {
      GRAPH ?g {
        ?subjectUri ${rdfType} ${scholarlyArticle} .
        OPTIONAL { ?subjectUri ${name} ?title . }
      }
    }
  `;
  const ratingSparql = `
    SELECT DISTINCT ?g ?about ?ratingValue
    WHERE {
      GRAPH ?g {
        ?ratingEntity ${about} ?about ;
                      ${ratingValuePred} ?ratingValue .
      }
    }
  `;

  const [{ bindings: pubRows }, { bindings: ratingRows }] = await Promise.all([
    query(pubSparql, contextGraphId),
    query(ratingSparql, contextGraphId),
  ]);

  type RatingHit = { ratingUal: string; ratingValue: string; tokenId: number };
  const ratingsByAbout = new Map<string, RatingHit>();
  const ratingUals = new Set<string>();

  for (const row of ratingRows) {
    const graphIri = sparqlTermOrNull(row, "g");
    const aboutIri = sparqlTermOrNull(row, "about");
    const ratingValueRaw = sparqlTermOrNull(row, "ratingValue");
    if (!graphIri || !aboutIri || !ratingValueRaw) {
      continue;
    }
    const parsed = ualFromVerifiableMemoryGraphIri(graphIri);
    if (!parsed) {
      continue;
    }
    ratingUals.add(parsed.ual);
    const ratingValue = literalLexicalForm(ratingValueRaw);
    const prev = ratingsByAbout.get(aboutIri);
    // Newest wins: after a cancel-and-retry the graph holds the orphaned R-KA
    // too, and the contract points at the later mint. See the header note.
    if (!prev || parsed.tokenId > prev.tokenId) {
      ratingsByAbout.set(aboutIri, {
        ratingUal: parsed.ual,
        ratingValue,
        tokenId: parsed.tokenId,
      });
    }
  }

  /** One row per publication UAL (NFT token). */
  const byUal = new Map<string, PublicationWithRatingBinding>();

  for (const row of pubRows) {
    const graphIri = sparqlTermOrNull(row, "g");
    const subjectUri = sparqlTermOrNull(row, "subjectUri");
    if (!graphIri || !subjectUri) {
      continue;
    }
    const parsed = ualFromVerifiableMemoryGraphIri(graphIri);
    if (!parsed) {
      continue;
    }
    // Never list an R-KA mint as a publication.
    if (ratingUals.has(parsed.ual)) {
      continue;
    }

    const titleRaw = sparqlTermOrNull(row, "title");
    const title = titleRaw ? literalLexicalForm(titleRaw) : null;
    const rating = ratingsByAbout.get(parsed.ual) ?? null;

    const existing = byUal.get(parsed.ual);
    // Same UAL can appear once per title binding; keep a non-empty title.
    if (
      existing &&
      existing.title &&
      (!title || title.trim().toLowerCase() === "untitled")
    ) {
      continue;
    }

    byUal.set(
      parsed.ual,
      publicationWithRatingBindingSchema.parse({
        pub: parsed.ual,
        subjectUri,
        title,
        rKaUal: rating?.ratingUal ?? null,
        ratingValue: rating?.ratingValue ?? null,
      })
    );
  }

  const out = [...byUal.values()];
  out.sort((a, b) => a.pub.localeCompare(b.pub));
  return { bindings: out };
}
