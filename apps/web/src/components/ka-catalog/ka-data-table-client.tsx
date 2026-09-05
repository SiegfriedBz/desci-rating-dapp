"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchKasAction } from "@/app/actions/kas";
import { KAS_QUERY_KEY, type KaRow } from "@/lib/queries/kas-types";
import { KaDataTable } from "./ka-data-table";

type KaDataTableClientProps = {
  initialData: KaRow[];
};

export function KaDataTableClient({ initialData }: KaDataTableClientProps) {
  const { data } = useQuery({
    queryKey: KAS_QUERY_KEY,
    queryFn: fetchKasAction,
    initialData,
    staleTime: 60_000,
  });

  return <KaDataTable data={data ?? []} />;
}
