/**
 * Every TanStack Query key in the app. Build keys only through these
 * factories so a key's shape — segments and their order — lives in one place.
 */
export const queryKeys = {
  /** Landing KA catalog. */
  kas: () => ["kas"] as const,
  /** `/rate-ka` list of KAs still Unrated on-chain. */
  unratedKas: () => ["unrated-kas"] as const,
  /** Watched on-chain rating for a UAL requested from the `/rate-ka` table. */
  ratingByUal: (ual: string | null) => ["rating-by-ual", ual] as const,
  /** On-chain rating for a UAL checked in the paste-a-UAL field. */
  ratingByUalPaste: (ual: string | null) =>
    ["rating-by-ual-paste", ual] as const,
};
