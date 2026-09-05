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
 * Assertion subjects are DOI/urn IRIs; the on-chain UAL is encoded in the
 * named GRAPH IRI under `_verifiable_memory` (not via `dkg:rootEntity` meta
 * on this daemon). Ratings `schema:about` that UAL.
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
  const { bindings: pubRows } = await query(pubSparql, contextGraphId);

  type PubHit = {
    pub: string;
    subjectUri: string;
    title: string | null;
    tokenId: number;
  };
  /** Latest VM version per assertion subject (highest token id). */
  const latestBySubject = new Map<string, PubHit>();

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
    const titleRaw = term(row, "title");
    const title = titleRaw ? literalLexicalForm(titleRaw) : null;
    const prev = latestBySubject.get(subjectUri);
    if (!prev || parsed.tokenId > prev.tokenId) {
      latestBySubject.set(subjectUri, {
        pub: parsed.ual,
        subjectUri,
        title,
        tokenId: parsed.tokenId,
      });
    }
  }

  const ratingSparql = `
    SELECT DISTINCT ?g ?about ?ratingValue
    WHERE {
      GRAPH ?g {
        ?ratingEntity ${about} ?about ;
                      ${ratingValuePred} ?ratingValue .
      }
    }
  `;
  const { bindings: ratingRows } = await query(ratingSparql, contextGraphId);

  type RatingHit = { ratingUal: string; ratingValue: string; tokenId: number };
  /** Prefer the highest-token R-KA when several rate the same target UAL. */
  const ratingsByAbout = new Map<string, RatingHit>();

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

  const out: PublicationWithRatingBinding[] = [];
  for (const pub of latestBySubject.values()) {
    const rating = ratingsByAbout.get(pub.pub) ?? null;
    out.push(
      publicationWithRatingBindingSchema.parse({
        pub: pub.pub,
        subjectUri: pub.subjectUri,
        title: pub.title,
        ratingSubject: rating?.ratingUal ?? null,
        ratingValue: rating?.ratingValue ?? null,
      })
    );
  }

  out.sort((a, b) => a.pub.localeCompare(b.pub));
  return { bindings: out };
}
