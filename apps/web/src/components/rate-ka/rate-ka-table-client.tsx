"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RATING_PHASE } from "@desci/shared";
import {
  queryRatingByUal,
  queryUnratedKas,
} from "@/lib/queries/contract/ratings";
import {
  UNRATED_KAS_QUERY_KEY,
  type UnratedKaRow,
} from "@/lib/queries/contract/ratings-types";
import { OracleRequestStatus } from "./oracle-request-status";
import { RateKaDataTable } from "./rate-ka-data-table";
import { useSyncCatalogsWithRating } from "./use-sync-catalogs-with-rating";

type RateKaTableClientProps = {
  initialData: UnratedKaRow[];
  emptyMessage?: string;
  /** When false, skip background refetch (DKG / RPC offline). */
  enableRefetch?: boolean;
};

export function RateKaTableClient({
  initialData,
  emptyMessage,
  enableRefetch = true,
}: RateKaTableClientProps) {
  const [watchingUal, setWatchingUal] = useState<string | null>(null);
  const [watchStartedAt, setWatchStartedAt] = useState<number | null>(null);

  const unratedQuery = useQuery({
    queryKey: UNRATED_KAS_QUERY_KEY,
    queryFn: queryUnratedKas,
    initialData,
    staleTime: 30_000,
    enabled: enableRefetch,
  });

  const ratingQuery = useQuery({
    queryKey: ["rating-by-ual", watchingUal],
    queryFn: () => queryRatingByUal(watchingUal!),
    enabled: Boolean(watchingUal),
    refetchInterval: (query) =>
      query.state.data?.phase === RATING_PHASE.Phase1Completed ? false : 5_000,
  });

  const watchedRating = ratingQuery.data ?? null;
  useSyncCatalogsWithRating(watchedRating);

  // The catalog refetch can land on an RPC node a block behind the one the
  // rating poll read; a rating never leaves Phase1Completed, so trust it.
  const rows = useMemo(() => {
    const data = unratedQuery.data ?? [];
    if (!watchedRating) {
      return data;
    }
    if (watchedRating.phase === RATING_PHASE.Phase1Completed) {
      return data.filter((row) => row.pub !== watchedRating.ual);
    }
    if (!watchedRating.isPending) {
      return data;
    }
    return data.map((row) =>
      row.pub === watchedRating.ual ? { ...row, isPending: true } : row
    );
  }, [unratedQuery.data, watchedRating]);

  const onRequestSuccess = useCallback((ual: string) => {
    setWatchingUal(ual);
    setWatchStartedAt(Date.now());
  }, []);

  return (
    <div className="space-y-4">
      {watchingUal && watchStartedAt != null ? (
        <OracleRequestStatus
          ual={watchingUal}
          rating={watchedRating}
          watchStartedAt={watchStartedAt}
        />
      ) : null}
      <RateKaDataTable
        data={rows}
        emptyMessage={emptyMessage}
        onRequestSuccess={onRequestSuccess}
      />
    </div>
  );
}
