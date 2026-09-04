export type { PublishRatingParams, PublishRatingResult } from "@desci/shared";

export type {
  PublicationAuthor,
  PublicationMetadata,
  PublicationResource,
  PublicationResourceKind,
  PublicationSection,
  PublicationSectionKind,
  PublishAssertionDeps,
  PublishPublicationParams,
  PublishPublicationResult,
  RatingBinding,
  TargetAssetBinding,
} from "./schema/index.js";

export {
  DEO_DATASET_DESCRIPTION,
  DEO_MATERIALS,
  DEO_METHODS,
  DEO_RESULTS,
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
} from "./publication-ka/index.js";

export {
  buildRatingGraph,
  publishRatingKa,
  queryRatingsAbout,
} from "./rating-ka/index.js";

export {
  createPublicationIdentity,
  createRatingIdentity,
  normalizeDoiIri,
  normalizeIpfsIri,
  normalizeOrcidIri,
  nquadIntegerLiteral,
  nquadStringLiteral,
  scicrunchResolverIri,
} from "./helpers/index.js";

export { TargetAssetNotIndexedError } from "./errors.js";
export { createDkgClient, type DkgClient } from "./client.js";
