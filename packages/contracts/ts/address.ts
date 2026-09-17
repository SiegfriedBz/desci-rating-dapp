import { clientEnv } from "@desci/env/client";
import { RATING_CONTROLLER_ADDRESSES } from "./deployments.js";

/**
 * The `RatingController` for the current environment.
 *
 * Hand-written, unlike `ts/deployments.ts`, so `scripts/export-abi.mjs`
 * cannot clobber it. The generated file is only a record of the last deploy:
 * staging and production run separate contracts, and one generated address
 * keyed by chain id cannot express that. `NEXT_PUBLIC_` because two of the
 * six call sites are client components.
 *
 * The chain-id guard is kept — the environment supplies the address, not the
 * chain, so an unsupported chain id is still a programming error.
 */
export function getRatingControllerAddress(chainId: number): `0x${string}` {
  if (!(chainId in RATING_CONTROLLER_ADDRESSES)) {
    throw new Error(`No deployment address found for chainId ${chainId}`);
  }
  return clientEnv.NEXT_PUBLIC_RATING_CONTROLLER_ADDRESS as `0x${string}`;
}
