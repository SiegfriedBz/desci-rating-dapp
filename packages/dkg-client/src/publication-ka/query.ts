import { BASE_SEPOLIA_CHAIN_ID, type SparqlBindings } from "@desci/shared";
import { sparqlIri, sparqlTermValue } from "../helpers/sparql.js";
import {
  publicationWithRatingBindingSchema,
  type PublicationWithRatingBinding,
} from "../schema/types.js";
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

function term(row: SparqlBindings[number], key: string): string | null {
  const raw = row[key];
  if (raw == null || raw === "") {
    return null;
  }
  const value = sparqlTermValue(raw);
  return value || null;
}

/**
 * Strip SPARQL / N-Quads literal wrappers: `"40"^^<xsd:integer>` → `40`.
 */
function literalLexicalForm(raw: string): string {
  const withDatatype = raw.match(/^"((?:\\.|[^"\\])*)"\^\^/);
  if (withDatatype) {
    return withDatatype[1] ?? raw;
  }
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * Derive on-chain UAL from a VM named-graph IRI.
 *
 * Observed DKG V10 shape:
 *   did:dkg:context-graph:{cg}/_verifiable_memory/{kasAddress}/{tokenId}
 * → did:dkg:base:{chainId}/{kasAddress}/{tokenId}
 */
export function ualFromVerifiableMemoryGraphIri(
  graphIri: string,
  chainId: number = BASE_SEPOLIA_CHAIN_ID
): { ual: string; tokenId: number } | null {
  const match = graphIri
    .trim()
    .match(/\/_verifiable_memory\/(0x[0-9a-fA-F]+)\/(\d+)\s*$/);
  if (!match) {
    return null;
  }
  const address = match[1]!.toLowerCase();
  const tokenId = Number.parseInt(match[2]!, 10);
  if (!Number.isFinite(tokenId)) {
    return null;
  }
  return {
    ual: `did:dkg:base:${chainId}/${address}/${tokenId}`,
    tokenId,
  };
}

/**
 * List ScholarlyArticle publications with resolved KA UALs and optional ratings.
 *
 * Each on-chain KA (NFT token / VM graph) is its own catalog row. Do **not**
 * collapse by DOI/`subjectUri` — republishing the same paper mints a new UAL
 * and ratings `schema:about` that specific UAL.
 *
 * R-KA graphs (from the rating query) are excluded so a rating mint never
 * appears as a publication row.
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
    const graphIri = term(row, "g");
    const aboutIri = term(row, "about");
    const ratingValueRaw = term(row, "ratingValue");
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
    const graphIri = term(row, "g");
    const subjectUri = term(row, "subjectUri");
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

    const titleRaw = term(row, "title");
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
