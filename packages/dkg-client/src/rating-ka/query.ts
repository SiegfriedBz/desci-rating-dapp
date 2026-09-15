import type { SparqlBindings } from "@desci/shared";
import { literalLexicalForm } from "../helpers/nquads.js";
import { sparqlIri, sparqlTermOrNull } from "../helpers/sparql.js";
import { ratingBindingSchema, type RatingBinding } from "../schema/types.js";
import { ualFromVerifiableMemoryGraphIri } from "../schema/ual.js";
import {
  DESCI_MISSING_EVIDENCE,
  DESCI_OBSERVED_EVIDENCE,
  SCHEMA_ABOUT,
  SCHEMA_AUTHOR,
  SCHEMA_DESCRIPTION,
  SCHEMA_RATING_VALUE,
} from "../schema/vocab.js";
import { parseLegacyEvidenceDescription } from "./legacy-description.js";

export type SparqlQueryFn = (
  sparql: string,
  contextGraphId: string,
  options?: {
    graphSuffix?: string;
    view?: "working-memory" | "shared-working-memory" | "verifiable-memory";
  }
) => Promise<{ bindings: SparqlBindings }>;

/**
 * SPARQL Action B: ratings that `schema:about` a target UAL.
 *
 * Two queries joined in JS rather than one `SELECT` with two repeated-literal
 * `OPTIONAL`s, which would return the cross product of the observed and missing
 * lists. Same shape as {@link queryPublicationsWithRatings}.
 *
 * The core query wraps the pattern in `GRAPH ?g` so `rKaUal` — the identity the
 * contract records and the detail pages route on — can be derived from the
 * verifiable-memory graph IRI. The local `ratingSubject` cannot be routed on.
 */
export async function queryRatingsAbout(
  query: SparqlQueryFn,
  targetUal: string,
  contextGraphId: string
): Promise<{ bindings: RatingBinding[] }> {
  const about = sparqlIri(SCHEMA_ABOUT);
  const ratingValue = sparqlIri(SCHEMA_RATING_VALUE);
  const author = sparqlIri(SCHEMA_AUTHOR);
  const description = sparqlIri(SCHEMA_DESCRIPTION);
  const observedEvidence = sparqlIri(DESCI_OBSERVED_EVIDENCE);
  const missingEvidence = sparqlIri(DESCI_MISSING_EVIDENCE);
  const target = sparqlIri(targetUal);

  const coreSparql = `
    SELECT DISTINCT ?g ?ratingSubject ?ratingValue ?author ?description
    WHERE {
      GRAPH ?g {
        ?ratingSubject ${about} ${target} ;
                       ${ratingValue} ?ratingValue ;
                       ${author} ?author .
        OPTIONAL { ?ratingSubject ${description} ?description . }
      }
    }
  `;
  // Variable predicate + FILTER rather than UNION/IN: an R-KA assertion is a
  // handful of triples, so the scan is free and this needs no SPARQL 1.1.
  const evidenceSparql = `
    SELECT DISTINCT ?ratingSubject ?predicate ?value
    WHERE {
      GRAPH ?g {
        ?ratingSubject ${about} ${target} ;
                       ?predicate ?value .
        FILTER (?predicate = ${observedEvidence} || ?predicate = ${missingEvidence})
      }
    }
  `;

  const [{ bindings: coreRows }, { bindings: evidenceRows }] =
    await Promise.all([
      query(coreSparql, contextGraphId),
      query(evidenceSparql, contextGraphId),
    ]);

  type Evidence = { observed: string[]; missing: string[] };
  const evidenceBySubject = new Map<string, Evidence>();

  for (const row of evidenceRows) {
    const ratingSubject = sparqlTermOrNull(row, "ratingSubject");
    const predicate = sparqlTermOrNull(row, "predicate");
    const raw = sparqlTermOrNull(row, "value");
    if (!ratingSubject || !predicate || !raw) {
      continue;
    }
    const value = literalLexicalForm(raw).trim();
    if (!value) {
      continue;
    }
    let evidence = evidenceBySubject.get(ratingSubject);
    if (!evidence) {
      evidence = { observed: [], missing: [] };
      evidenceBySubject.set(ratingSubject, evidence);
    }
    const bucket =
      predicate === DESCI_OBSERVED_EVIDENCE
        ? evidence.observed
        : evidence.missing;
    if (!bucket.includes(value)) {
      bucket.push(value);
    }
  }

  /** One binding per rating; a subject can bind more than once via `OPTIONAL`. */
  const bySubject = new Map<string, RatingBinding>();

  for (const row of coreRows) {
    const ratingSubject = sparqlTermOrNull(row, "ratingSubject");
    const ratingValueRaw = sparqlTermOrNull(row, "ratingValue");
    const authorRaw = sparqlTermOrNull(row, "author");
    if (!ratingSubject || !ratingValueRaw || !authorRaw) {
      continue;
    }

    const descriptionRaw = sparqlTermOrNull(row, "description");
    const descriptionText = descriptionRaw
      ? literalLexicalForm(descriptionRaw)
      : null;

    // Keep whichever row actually carried the description.
    if (bySubject.get(ratingSubject)?.description && !descriptionText) {
      continue;
    }

    const evidence = evidenceBySubject.get(ratingSubject);
    // Only reach for the prose when the structured triples are absent, so a
    // rationale that happens to look legacy is never re-parsed.
    const legacy =
      !evidence && descriptionText
        ? parseLegacyEvidenceDescription(descriptionText)
        : null;
    const graphIri = sparqlTermOrNull(row, "g");

    bySubject.set(
      ratingSubject,
      ratingBindingSchema.parse({
        ratingSubject,
        rKaUal: graphIri
          ? (ualFromVerifiableMemoryGraphIri(graphIri)?.ual ?? null)
          : null,
        ratingValue: literalLexicalForm(ratingValueRaw),
        author: literalLexicalForm(authorRaw),
        description: descriptionText,
        rationale: legacy ? legacy.rationale : descriptionText,
        observed: evidence?.observed ?? legacy?.observed ?? [],
        missing: evidence?.missing ?? legacy?.missing ?? [],
      })
    );
  }

  return { bindings: [...bySubject.values()] };
}
