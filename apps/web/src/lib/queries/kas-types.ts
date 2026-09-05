/**
 * Catalog row for the landing table.
 * Keys mirror PublicationWithRatingBinding; only `ratingValue` is
 * coerced from string → number in getKas().
 */
export type KaRow = {
  /** Target KA UAL (`did:dkg:…`). */
  pub: string;
  /** RDF assertion subject (often a DOI IRI). */
  subjectUri: string | null;
  title: string | null;
  /** R-KA UAL when rated. */
  ratingSubject: string | null;
  ratingValue: number | null;
};
