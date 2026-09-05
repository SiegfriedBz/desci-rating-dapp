import type { KnowledgeAssetQuad } from "@desci/shared";
import { z } from "zod";

// TODO: migrate TargetAssetBinding to a Zod schema
//       (see publicationWithRatingBindingSchema for the pattern — separate chore)
export type TargetAssetBinding = {
  subject: string;
  predicate: string;
  object: string;
};

// TODO: migrate RatingBinding to a Zod schema
//       (see publicationWithRatingBindingSchema for the pattern — separate chore)
export type RatingBinding = {
  ratingSubject: string;
  ratingValue: string;
  author: string;
  /** schema:description when present (older R-KAs may omit it). */
  description: string | null;
};

/**
 * Plain type (not `z.infer`) so consumers resolve it without needing `zod`
 * on their own module graph (pnpm isolation + IDE language service).
 */
export type PublicationWithRatingBinding = {
  /** On-chain Knowledge Asset UAL (`did:dkg:…`). */
  pub: string;
  /** RDF assertion subject (often a DOI IRI); null if unknown. */
  subjectUri: string | null;
  title: string | null;
  /** R-KA on-chain UAL when a rating exists; null otherwise. */
  rKaUal: string | null;
  ratingValue: string | null;
};

/**
 * Zod here because SPARQL rows come from the DKG daemon (external process).
 * A plain cast fails silently if the daemon changes its response shape.
 */
export const publicationWithRatingBindingSchema: z.ZodType<PublicationWithRatingBinding> =
  z.object({
    pub: z.string(),
    subjectUri: z.string().nullable(),
    title: z.string().nullable(),
    rKaUal: z.string().nullable(),
    ratingValue: z.string().nullable(),
  });

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
