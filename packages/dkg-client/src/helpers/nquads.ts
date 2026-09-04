const XSD_INTEGER = "http://www.w3.org/2001/XMLSchema#integer";

/** N-Triples / SPARQL string literal with required escapes. */
export function nquadStringLiteral(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

export function nquadIntegerLiteral(value: number): string {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new Error(`value must be a finite integer, got ${value}`);
  }
  return `"${value}"^^${XSD_INTEGER}`;
}
