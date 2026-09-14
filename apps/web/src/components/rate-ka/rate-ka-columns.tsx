"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import type { UnratedKaRow } from "@/lib/queries/contract/ratings-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RequestPhase1Button } from "./request-phase1-button";
import { RATE_KA_TABLE_HEADERS, truncateUal } from "./rate-ka-table-meta";

function TruncatedIriWithTooltip({ iri }: { iri: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-xs">{truncateUal(iri)}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-md break-all font-mono">
        {iri}
      </TooltipContent>
    </Tooltip>
  );
}

type UseRateKaColumnsOptions = {
  onRequestSuccess?: (ual: string) => void;
};

export function useRateKaColumns({
  onRequestSuccess,
}: UseRateKaColumnsOptions = {}): ColumnDef<UnratedKaRow>[] {
  return useMemo(
    () => [
      {
        accessorKey: "title",
        header: RATE_KA_TABLE_HEADERS[0],
        cell: ({ row }) => {
          if (row.original.title) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block max-w-[18rem] truncate sm:max-w-[24rem]">
                    {row.original.title}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  {row.original.title}
                </TooltipContent>
              </Tooltip>
            );
          }
          const fallback = row.original.subjectUri ?? row.original.pub;
          return <TruncatedIriWithTooltip iri={fallback} />;
        },
      },
      {
        accessorKey: "pub",
        header: RATE_KA_TABLE_HEADERS[1],
        cell: ({ row }) => <TruncatedIriWithTooltip iri={row.original.pub} />,
      },
      {
        id: "status",
        header: RATE_KA_TABLE_HEADERS[2],
        cell: ({ row }) =>
          row.original.isPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-500">
              <span
                className="size-1.5 animate-pulse rounded-full bg-amber-400"
                aria-hidden
              />
              Pending
            </span>
          ) : (
            <span className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              Unrated
            </span>
          ),
      },
      {
        id: "action",
        header: RATE_KA_TABLE_HEADERS[3],
        cell: ({ row }) =>
          row.original.isPending ? (
            <span className="text-xs text-muted">Oracle processing…</span>
          ) : (
            <RequestPhase1Button
              targetUal={row.original.pub}
              onSuccess={onRequestSuccess}
            />
          ),
      },
    ],
    [onRequestSuccess]
  );
}
