import {
  RDF_TYPE,
  SCHEMA_CONTENT_URL,
  SCHEMA_ENCODING,
  SCHEMA_ENCODING_FORMAT,
  SCHEMA_MEDIA_OBJECT,
  type TargetAssetBinding,
} from "@desci/dkg-client";

const DROP_PREDICATES = new Set([
  SCHEMA_ENCODING,
  SCHEMA_CONTENT_URL,
  SCHEMA_ENCODING_FORMAT,
]);

/**
 * Serialize KA bindings as N-Triples-like lines for the LLM prompt.
 * Drops platform PDF encoding triples so a pinned CID cannot affect the score.
 */
export function formatTriples(bindings: TargetAssetBinding[]): string {
  const mediaObjectSubjects = new Set(
    bindings
      .filter(
        (b) => b.predicate === RDF_TYPE && b.object === SCHEMA_MEDIA_OBJECT
      )
      .map((b) => b.subject)
  );

  return bindings
    .filter((b) => {
      if (DROP_PREDICATES.has(b.predicate)) {
        return false;
      }
      if (
        b.predicate === RDF_TYPE &&
        b.object === SCHEMA_MEDIA_OBJECT
      ) {
        return false;
      }
      if (mediaObjectSubjects.has(b.subject)) {
        return false;
      }
      if (mediaObjectSubjects.has(b.object)) {
        return false;
      }
      return true;
    })
    .map(
      (b) =>
        `<${b.subject}> <${b.predicate}> ${
          b.object.startsWith("http") || b.object.startsWith("urn:")
            ? `<${b.object}>`
            : JSON.stringify(b.object)
        } .`
    )
    .join("\n");
}
