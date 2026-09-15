/**
 * Universal Asset Locator grammar: `did:dkg:base:{chainId}/{kasAddress}/{tokenId}`.
 *
 * Strict by design — the only UALs the app can resolve are ones the DKG
 * actually minted, so anything else should fail rather than 404 late.
 */
const UAL_PATTERN = /^did:dkg:base:(\d+)\/(0x[0-9a-fA-F]{40})\/(\d+)$/;

export type ParsedUal = {
  chainId: number;
  /** Knowledge Asset Storage contract, as written in the UAL (not checksummed). */
  kasAddress: string;
  /** Kept as a string to avoid precision loss; coerce where you need to sort. */
  tokenId: string;
};

/** Parse a UAL, or return null when it does not match the grammar. */
export function parseUal(value: string): ParsedUal | null {
  const match = UAL_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, chainId, kasAddress, tokenId] = match;
  return {
    chainId: Number(chainId),
    kasAddress: kasAddress!,
    tokenId: tokenId!,
  };
}

export function isUal(value: string): boolean {
  return parseUal(value) !== null;
}
