export type {
  PublishRatingParams,
  PublishRatingResult,
  StoreRatingResult,
} from "@desci/shared";

export type {
  ParsedUal,
  PublicationAuthor,
  PublicationMetadata,
  PublicationResource,
  PublicationResourceKind,
  PublicationSection,
  PublicationSectionKind,
  PublicationWithRatingBinding,
  PublishAssertionDeps,
  PublishPublicationParams,
  PublishPublicationResult,
  RatingBinding,
  StoreAssertionDeps,
  StorePublicationResult,
  TargetAssetBinding,
} from "./schema/index.js";

export {
  isUal,
  parseUal,
  publicationWithRatingBindingSchema,
  ratingBindingSchema,
  ualFromVerifiableMemoryGraphIri,
  DEO_DATASET_DESCRIPTION,
  DEO_MATERIALS,
  DEO_METHODS,
  DEO_RESULTS,
  DESCI_MISSING_EVIDENCE,
  DESCI_NS,
  DESCI_OBSERVED_EVIDENCE,
  RDF_TYPE,
  SCHEMA_ADDITIONAL_TYPE,
  SCHEMA_AUTHOR,
  SCHEMA_CONTENT_URL,
  SCHEMA_CREATOR,
  SCHEMA_DATE_CREATED,
  SCHEMA_DESCRIPTION,
  SCHEMA_DISTRIBUTION,
  SCHEMA_ENCODING,
  SCHEMA_ENCODING_FORMAT,
  SCHEMA_HAS_PART,
  SCHEMA_IDENTIFIER,
  SCHEMA_MEDIA_OBJECT,
  SCHEMA_MENTIONS,
  SCHEMA_NAME,
  SCHEMA_PERSON,
  SCHEMA_POSITION,
  SCHEMA_SAME_AS,
  SCHEMA_SCHOLARLY_ARTICLE,
  SCHEMA_TEXT,
} from "./schema/index.js";

export {
  buildPublicationGraph,
  pdfIpfsUrlFromBindings,
  publishPublicationKa,
  queryPublicationsWithRatings,
  storePublicationKa,
} from "./publication-ka/index.js";

export {
  buildRatingGraph,
  parseLegacyEvidenceDescription,
  publishRatingKa,
  queryRatingsAbout,
  storeRatingKa,
  type LegacyEvidenceDescription,
} from "./rating-ka/index.js";

export {
  createPublicationIdentity,
  createRatingIdentity,
  literalLexicalForm,
  normalizeDoiIri,
  normalizeIpfsIri,
  normalizeOrcidIri,
  nquadIntegerLiteral,
  nquadStringLiteral,
  scicrunchResolverIri,
} from "./helpers/index.js";

export { TargetAssetNotIndexedError } from "./errors.js";
export { createDkgClient, type DkgClient } from "./client.js";
export type { KnowledgeAssetState } from "./daemon/types.js";
export { probeDkgDaemon, type DkgProbeResult } from "./daemon/probe.js";
