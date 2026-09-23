"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RATING_PHASE } from "@desci/shared";
import {
  UNRATED_KAS_QUERY_KEY,
  type OnChainRating,
} from "@/lib/queries/contract/ratings-types";
import { KAS_QUERY_KEY } from "@/lib/queries/kas-types";

/**
 * Refetch the catalogs when a watched rating changes state, so the tables
 * follow the single-UAL poll instead of polling the whole graph themselves.
 * Pending refreshes the `/rate-ka` list; completion also refreshes the
 * landing catalog so the score appears there.
 */
export function useSyncCatalogsWithRating(rating: OnChainRating | null) {
  const queryClient = useQueryClient();
  const ual = rating?.ual ?? null;
  const isPending = rating?.isPending === true;
  const isCompleted = rating?.phase === RATING_PHASE.Phase1Completed;

  useEffect(() => {
    if (!ual || (!isPending && !isCompleted)) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: UNRATED_KAS_QUERY_KEY });
    if (isCompleted) {
      void queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEY });
    }
  }, [queryClient, ual, isPending, isCompleted]);
}
