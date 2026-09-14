"use server";

import {
  createDkgClient,
  queryPublicationsWithRatings,
  type PublicationWithRatingBinding,
} from "@desci/dkg-client";
import { requireDkgContextGraphId } from "@desci/env";
import {
  getRatingControllerAddress,
  ratingControllerAbi,
} from "@desci/contracts";
import { BASE_SEPOLIA_CHAIN_ID, RATING_PHASE } from "@desci/shared";
import { getEvmClient } from "@/lib/evm-client";
import {
  LANDING_KA_CATALOG_LIMIT,
  type KaRow,
} from "@/lib/queries/kas-types";

function parseRatingValue(raw: string | null): number | null {
  if (raw == null) {
    return null;
  }
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

/** Token id from `did:dkg:base:{chain}/{addr}/{tokenId}` (0 if unparseable). */
function tokenIdFromUal(ual: string): number {
  const match = ual.match(/\/(\d+)\s*$/);
  if (!match) {
    return 0;
  }
  const id = Number.parseInt(match[1]!, 10);
  return Number.isFinite(id) ? id : 0;
}

const ratingController = getRatingControllerAddress(BASE_SEPOLIA_CHAIN_ID);

/**
 * List publication KAs (+ optional ratings) from the system context graph.
 * Landing preview only — newest first, capped at {@link LANDING_KA_CATALOG_LIMIT}.
 *
 * Rating data comes from DKG SPARQL first. For rows where SPARQL has no rating
 * (e.g. DEV_SKIP_DKG_MINT or DKG sync lag), we fall back to the on-chain
 * RatingRecord via multicall so the score and R-KA UAL are always shown.
 *
 * Throws on DKG failure so server components can show an unavailable state.
 */
export async function getKas(): Promise<KaRow[]> {
  const contextGraphId = requireDkgContextGraphId("listing Knowledge Assets");

  const client = await createDkgClient();
  let rows: KaRow[];
  try {
    const bindings: PublicationWithRatingBinding[] = (
      await queryPublicationsWithRatings(client.query, contextGraphId)
    ).bindings;

    rows = bindings
      .map(
        (binding): KaRow => ({
          pub: binding.pub,
          subjectUri: binding.subjectUri,
          title: binding.title,
          rKaUal: binding.rKaUal,
          ratingValue: parseRatingValue(binding.ratingValue),
        })
      )
      .sort((a, b) => tokenIdFromUal(b.pub) - tokenIdFromUal(a.pub))
      .slice(0, LANDING_KA_CATALOG_LIMIT);
  } finally {
    await client.stop();
  }

  // For rows that SPARQL didn't return a rating for, check on-chain.
  // This covers DEV_SKIP_DKG_MINT and any DKG sync lag after a real mint.
  const unratedIndices = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.rKaUal == null);

  if (unratedIndices.length > 0) {
    const results = await getEvmClient().multicall({
      allowFailure: true,
      contracts: unratedIndices.map(({ r }) => ({
        address: ratingController,
        abi: ratingControllerAbi,
        functionName: "getRatingByUal" as const,
        args: [r.pub] as const,
      })),
    });

    for (let j = 0; j < unratedIndices.length; j++) {
      const result = results[j];
      const idx = unratedIndices[j]!.i;
      if (!result || result.status !== "success") continue;
      const record = result.result;
      if (Number(record.phase) >= RATING_PHASE.Phase1Completed && record.rKaUal) {
        rows[idx] = {
          ...rows[idx]!,
          rKaUal: record.rKaUal,
          ratingValue: Number(record.phase1Score),
        };
      }
    }
  }

  return rows;
}

/** Safe client refetch wrapper for TanStack Query (never throws). */
export async function queryKas(): Promise<KaRow[]> {
  try {
    return await getKas();
  } catch {
    return [];
  }
}
