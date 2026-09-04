import type { KnowledgeAssetQuad } from "@desci/shared";

export type TargetAssetBinding = {
  subject: string;
  predicate: string;
  object: string;
};

export type RatingBinding = {
  ratingSubject: string;
  ratingValue: string;
  author: string;
  /** schema:description when present (older R-KAs may omit it). */
  description: string | null;
};

export type PublicationAuthor = {
  name: string;
  orcid: string | null;
};

export type PublicationSectionKind =
  | "methods"
  | "materials"
  | "results"
  | "data_availability";

export type PublicationSection = {
  heading: string;
  text: string;
  kind: PublicationSectionKind;
};

export type PublicationResourceKind = "antibody" | "cell_line" | "software";

export type PublicationResource = {
  kind: PublicationResourceKind;
  name: string;
  rrid: string | null;
};

export type PublicationMetadata = {
  title: string;
  abstract: string;
  authors: PublicationAuthor[];
  doi: string | null;
  sections: PublicationSection[];
  resources: PublicationResource[];
  dataRepositoryUrls: string[];
  /** IPFS CID of the ingested PDF bytes (no ipfs:// prefix), or null. */
  pdfCid: string | null;
};

export type PublishPublicationParams = {
  contextGraphId: string;
  /** Named KA within the context graph; defaults to a unique `desci-pub-*` id. */
  name?: string;
  meta: PublicationMetadata;
  /** Override provenance creator string (defaults to grobid + GEMINI_MODEL). */
  creator?: string;
  /** ISO-8601 ingest timestamp; defaults to now. */
  dateCreated?: string;
};

export type PublishPublicationResult = {
  ual: string;
  name: string;
  subjectUri: string;
};

/** Shared dependency for minting any Knowledge Asset via the daemon. */
export type PublishAssertionDeps = {
  publishAssertion: (
    contextGraphId: string,
    name: string,
    quads: KnowledgeAssetQuad[]
  ) => Promise<{ ual: string }>;
};
