import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RATE_KA_TABLE_HEADERS } from "./rate-ka-table-meta";

const SKELETON_ROWS = 5;

export function RateKaTableSkeleton() {
  return (
    <div
      className="rounded-md border"
      aria-busy="true"
      aria-label="Loading unrated Knowledge Assets"
    >
      <Table>
        <TableHeader>
          <TableRow>
            {RATE_KA_TABLE_HEADERS.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {RATE_KA_TABLE_HEADERS.map((header) => (
                <TableCell key={header}>
                  <Skeleton className="h-4 w-full max-w-[12rem]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
