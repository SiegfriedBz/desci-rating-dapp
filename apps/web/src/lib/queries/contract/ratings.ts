"use server";

import {
  getRatingControllerAddress,
  ratingControllerAbi,
} from "@desci/contracts";
import { BASE_SEPOLIA_CHAIN_ID, RATING_PHASE } from "@desci/shared";
import { getEvmClient } from "@/lib/evm-client";
import { getKas } from "@/lib/queries/dkg/kas";
import type { OnChainRating, UnratedKaRow } from "./ratings-types";

export type { OnChainRating, UnratedKaRow } from "./ratings-types";

const ratingController = getRatingControllerAddress(BASE_SEPOLIA_CHAIN_ID);

/**
 * Read on-chain RatingRecord for a single UAL.
 */
export async function getRatingByUal(ual: string): Promise<OnChainRating> {
  const trimmed = ual.trim();
  if (!trimmed) {
    throw new Error("UAL is required");
  }

  const record = await getEvmClient().readContract({
    address: ratingController,
    abi: ratingControllerAbi,
    functionName: "getRatingByUal",
    args: [trimmed],
  });

  return {
    ual: trimmed,
    phase: Number(record.phase),
    isPending: Boolean(record.isPending),
    phase1Score: Number(record.phase1Score),
    rKaUal: record.rKaUal ?? "",
  };
}

/**
 * Safe client wrapper for {@link getRatingByUal}.
 */
export async function queryRatingByUal(
  ual: string
): Promise<OnChainRating | null> {
  try {
    return await getRatingByUal(ual);
  } catch {
    return null;
  }
}

/**
 * All DKG catalog KAs that are still Unrated on-chain (phase === 0),
 * whether or not they have a pending oracle request.
 * Pending rows are included so users can see their in-flight request.
 * Throws on DKG / RPC failure so server components can show unavailable UI.
 */
export async function getUnratedKas(): Promise<UnratedKaRow[]> {
  const kas = await getKas();
  if (kas.length === 0) {
    return [];
  }

  const results = await getEvmClient().multicall({
    allowFailure: true,
    contracts: kas.map((row) => ({
      address: ratingController,
      abi: ratingControllerAbi,
      functionName: "getRatingByUal" as const,
      args: [row.pub] as const,
    })),
  });

  const unrated: UnratedKaRow[] = [];
  for (let i = 0; i < kas.length; i++) {
    const result = results[i];
    const row = kas[i]!;
    if (!result || result.status !== "success") {
      continue;
    }
    const record = result.result;
    const phase = Number(record.phase);
    const isPending = Boolean(record.isPending);
    // Include both free (isPending=false) and in-flight (isPending=true) KAs.
    // Rated KAs (phase > 0) are excluded — they belong on the landing catalog.
    if (phase === RATING_PHASE.Unrated) {
      unrated.push({
        pub: row.pub,
        subjectUri: row.subjectUri,
        title: row.title,
        isPending,
      });
    }
  }

  return unrated;
}

/** Safe client refetch wrapper for TanStack Query (never throws). */
export async function queryUnratedKas(): Promise<UnratedKaRow[]> {
  try {
    return await getUnratedKas();
  } catch {
    return [];
  }
}
