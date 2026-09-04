/** Thrown when the daemon has no quads for a target UAL (retriable). */
export class TargetAssetNotIndexedError extends Error {
  readonly code = "TargetAssetNotIndexed" as const;

  constructor(targetUal: string) {
    super(`TargetAssetNotIndexed: no triples found for ${targetUal}`);
    this.name = "TargetAssetNotIndexedError";
  }
}
