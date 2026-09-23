"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKas } from "@/lib/queries/dkg/kas";
import type { KaRow } from "@/lib/queries/kas-types";
import { queryKeys } from "@/lib/queries/query-keys";
import { KaDataTable } from "./ka-data-table";

type KaDataTableClientProps = {
  initialData: KaRow[];
  emptyMessage?: string;
  /** When false, skip background refetch (DKG offline). */
  enableRefetch?: boolean;
};

export function KaDataTableClient({
  initialData,
  emptyMessage,
  enableRefetch = true,
}: KaDataTableClientProps) {
  const { data } = useQuery({
    queryKey: queryKeys.kas(),
    queryFn: queryKas,
    initialData,
    staleTime: 60_000,
    enabled: enableRefetch,
  });

  return <KaDataTable data={data ?? []} emptyMessage={emptyMessage} />;
}
