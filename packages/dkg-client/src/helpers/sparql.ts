/**
 * Validate an IRI for SPARQL injection. Preserves DID/UAL characters
 * (`:`, `/`, etc.). Only rejects empty values, whitespace, or `>`.
 */
export function assertSparqlIri(value: string): string {
  const iri = value.trim();
  if (!iri || /\s/.test(iri) || iri.includes(">")) {
    throw new Error(`Invalid SPARQL IRI: ${JSON.stringify(value)}`);
  }
  return iri;
}

export function sparqlIri(value: string): string {
  return `<${assertSparqlIri(value)}>`;
}

/**
 * Unwrap a W3C SPARQL JSON term (`{ type, value }`) or pass through a plain string.
 */
export function sparqlTermValue(term: unknown): string {
  if (typeof term === "string") {
    return term;
  }
  if (term && typeof term === "object" && "value" in term) {
    const value = (term as { value: unknown }).value;
    if (typeof value === "string") {
      return value;
    }
    if (value == null) {
      return "";
    }
    return String(value);
  }
  if (term == null) {
    return "";
  }
  return String(term);
}
