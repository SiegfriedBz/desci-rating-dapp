import "server-only";

import {
  createDkgClient,
  queryPublicationsWithRatings,
  type PublicationWithRatingBinding,
} from "@desci/dkg-client";
import { requireDkgContextGraphId } from "@desci/env";
import type { KaRow } from "./kas-types";

export type { KaRow } from "./kas-types";

/** Hard cap for the landing-page catalog preview (no pager on `/`). */
export const LANDING_KA_CATALOG_LIMIT = 12;

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

/**
 * List publication KAs (+ optional ratings) from the system context graph.
 * Landing preview only — newest first, capped at {@link LANDING_KA_CATALOG_LIMIT}.
 *
 * TODO: accept ?graph= URL param once oracle supports multi-graph
 */
export async function getKas(): Promise<KaRow[]> {
  const contextGraphId = requireDkgContextGraphId("listing Knowledge Assets");

  const client = await createDkgClient();
  try {
    const bindings: PublicationWithRatingBinding[] = (
      await queryPublicationsWithRatings(client.query, contextGraphId)
    ).bindings;

    return bindings
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
}
