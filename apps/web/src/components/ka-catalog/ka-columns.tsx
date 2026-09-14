"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleSlash2 } from "lucide-react";
import type { KaRow } from "@/lib/queries/kas-types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KA_TABLE_HEADERS, truncateUal } from "./ka-table-meta";

function MissingValue() {
  return (
    <CircleSlash2
      aria-label="Not rated"
      className="text-muted-foreground h-4 w-4"
    />
  );
}

function TruncatedIriWithTooltip({ iri }: { iri: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="font-mono text-xs">
          {truncateUal(iri)}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-md break-all font-mono">
        {iri}
      </TooltipContent>
    </Tooltip>
  );
}

export function useKaColumns(): ColumnDef<KaRow>[] {
  return [
    {
      accessorKey: "title",
      header: KA_TABLE_HEADERS[0],
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
      header: KA_TABLE_HEADERS[1],
      cell: ({ row }) => <TruncatedIriWithTooltip iri={row.original.pub} />,
    },
    {
      accessorKey: "ratingValue",
      header: KA_TABLE_HEADERS[2],
      cell: ({ row }) =>
        row.original.ratingValue == null ? (
          <MissingValue />
        ) : (
          row.original.ratingValue
        ),
    },
    {
      accessorKey: "rKaUal",
      header: KA_TABLE_HEADERS[3],
      cell: ({ row }) =>
        row.original.rKaUal ? (
          <TruncatedIriWithTooltip iri={row.original.rKaUal} />
        ) : (
          <MissingValue />
        ),
    },
  ];
}
