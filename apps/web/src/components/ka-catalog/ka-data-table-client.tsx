"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKas } from "@/lib/queries/dkg/kas";
import { KAS_QUERY_KEY, type KaRow } from "@/lib/queries/kas-types";
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
    queryKey: KAS_QUERY_KEY,
    queryFn: queryKas,
    initialData,
    staleTime: 60_000,
    enabled: enableRefetch,
  });

  return <KaDataTable data={data ?? []} emptyMessage={emptyMessage} />;
}
