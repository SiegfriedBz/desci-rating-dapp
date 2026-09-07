"use client";

import { useCallback, useState } from "react";
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
    refetchInterval: watchingUal ? 5_000 : false,
  });

  const ratingQuery = useQuery({
    queryKey: ["rating-by-ual", watchingUal],
    queryFn: () => queryRatingByUal(watchingUal!),
    enabled: Boolean(watchingUal),
    refetchInterval: (query) => {
      const rating = query.state.data;
      if (!rating) {
        return 5_000;
      }
      if (rating.phase === RATING_PHASE.Phase1Completed) {
        return false;
      }
      // Keep polling while pending or until stall UI is useful.
      if (rating.isPending) {
        return 5_000;
      }
      return 5_000;
    },
  });

  const onRequestSuccess = useCallback((ual: string) => {
    setWatchingUal(ual);
    setWatchStartedAt(Date.now());
  }, []);

  return (
    <div className="space-y-4">
      {watchingUal && watchStartedAt != null ? (
        <OracleRequestStatus
          ual={watchingUal}
          rating={ratingQuery.data ?? null}
          watchStartedAt={watchStartedAt}
        />
      ) : null}
      <RateKaDataTable
        data={unratedQuery.data ?? []}
        emptyMessage={emptyMessage}
        onRequestSuccess={onRequestSuccess}
      />
    </div>
  );
}
