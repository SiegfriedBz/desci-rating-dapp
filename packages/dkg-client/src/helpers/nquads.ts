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

const LITERAL_ESCAPES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "'": "'",
  "\\": "\\",
};

/**
 * Inverse of {@link nquadStringLiteral}: unwrap a term the daemon returns as
 * serialized N-Quads and undo the escapes.
 *
 *   `"40"^^<xsd:integer>` → `40`
 *   `"line\nline"`        → `line` + newline + `line`
 *
 * IRIs and bare values pass through untouched.
 */
export function literalLexicalForm(raw: string): string {
  const withDatatype = raw.match(/^"((?:\\.|[^"\\])*)"\^\^/);
  if (withDatatype) {
    return unescapeLiteral(withDatatype[1] ?? raw);
  }
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return unescapeLiteral(raw.slice(1, -1));
  }
  return raw;
}

function unescapeLiteral(value: string): string {
  if (!value.includes("\\")) {
    return value;
  }
  return value.replace(/\\(.)/g, (match, char: string) => {
    return LITERAL_ESCAPES[char] ?? match;
  });
}
