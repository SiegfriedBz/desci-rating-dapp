import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KA_TABLE_HEADERS } from "./ka-table-meta";

const SKELETON_ROWS = 5;

export function KaTableSkeleton() {
  return (
    <div className="rounded-md border" aria-busy="true" aria-label="Loading catalog">
      <Table>
        <TableHeader>
          <TableRow>
            {KA_TABLE_HEADERS.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
            <TableRow key={rowIndex}>
              {KA_TABLE_HEADERS.map((header) => (
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
