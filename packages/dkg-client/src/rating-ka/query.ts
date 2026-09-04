import type { SparqlBindings } from "@desci/shared";
import { sparqlIri, sparqlTermValue } from "../helpers/sparql.js";
import type { RatingBinding } from "../schema/types.js";
import {
  SCHEMA_ABOUT,
  SCHEMA_AUTHOR,
  SCHEMA_DESCRIPTION,
  SCHEMA_RATING_VALUE,
} from "../schema/vocab.js";

export type SparqlQueryFn = (
  sparql: string,
  contextGraphId: string
) => Promise<{ bindings: SparqlBindings }>;

/** SPARQL Action B: ratings that schema:about a target UAL. */
export async function queryRatingsAbout(
  query: SparqlQueryFn,
  targetUal: string,
  contextGraphId: string
): Promise<{ bindings: RatingBinding[] }> {
  const about = sparqlIri(SCHEMA_ABOUT);
  const ratingValue = sparqlIri(SCHEMA_RATING_VALUE);
  const author = sparqlIri(SCHEMA_AUTHOR);
  const description = sparqlIri(SCHEMA_DESCRIPTION);
  const target = sparqlIri(targetUal);
  const sparql = `
    SELECT ?ratingSubject ?ratingValue ?author ?description
    WHERE {
      ?ratingSubject ${about} ${target} ;
                     ${ratingValue} ?ratingValue ;
                     ${author} ?author .
      OPTIONAL { ?ratingSubject ${description} ?description . }
    }
  `;
  const { bindings } = await query(sparql, contextGraphId);
  return {
    bindings: bindings.map((row) => ({
      ratingSubject: sparqlTermValue(row["ratingSubject"]),
      ratingValue: sparqlTermValue(row["ratingValue"]),
      author: sparqlTermValue(row["author"]),
      description: row["description"]
        ? sparqlTermValue(row["description"])
        : null,
    })),
  };
}
