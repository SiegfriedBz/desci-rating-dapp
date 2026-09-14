/**
 * Catalog row shown in the /rate-ka table.
 * phase === Unrated on-chain; may or may not have a pending oracle request.
 */
export type UnratedKaRow = {
  pub: string;
  subjectUri: string | null;
  title: string | null;
  /** true when requestPhase1 was submitted but the oracle hasn't fulfilled yet. */
  isPending: boolean;
};

export type OnChainRating = {
  ual: string;
  phase: number;
  isPending: boolean;
  phase1Score: number;
  rKaUal: string;
};

/** Shared TanStack Query key for the unrated-KA table on `/rate-ka`. */
export const UNRATED_KAS_QUERY_KEY = ["unrated-kas"] as const;
