import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TransactionSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-y-2 overflow-hidden">
      {/* Header */}
      <div className="bg-background/95 flex shrink-0 items-center gap-3 border-b px-4 py-2 backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div>
            <div className="text-muted-foreground text-[10px] uppercase">
              Driver
            </div>
            <Skeleton className="mt-1 h-5 w-40" />
          </div>

          <div className="bg-border h-7 w-px" />

          <div>
            <div className="text-muted-foreground text-[10px] uppercase">
              Range
            </div>
            <Skeleton className="mt-1 h-5 w-36" />
          </div>

          <div>
            <div className="text-muted-foreground text-[10px] uppercase">
              Status
            </div>

            <Badge variant="ghost">
              <Skeleton className="h-4 w-20" />
            </Badge>
          </div>

          <div className="bg-border h-7 w-px" />

          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-6" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-72 rounded-md" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Fake graph */}
      <div className="shrink-0 px-35 py-7">
        <Skeleton className="h-[202px] w-full rounded-md" />
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto pt-[1px]">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-34">Time</TableHead>
              <TableHead className="w-20">Duration</TableHead>
              <TableHead className="w-52">Event</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-18">Status</TableHead>
              <TableHead className="w-18">Origin</TableHead>
              <TableHead className="w-30">Odometer</TableHead>
              <TableHead className="w-30">Eng. Hours</TableHead>
              <TableHead className="w-52">Note</TableHead>
              <TableHead className="w-14">ELD</TableHead>
              <TableHead className="w-14">Vehicle</TableHead>
              <TableHead className="w-14">ID</TableHead>
              <TableHead className="w-24">Operation</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: 14 }).map((_, row) => (
              <TableRow key={row}>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="mx-auto h-3 w-3 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="mx-auto h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="mx-auto h-5 w-14 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="mx-auto h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="mx-auto h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-10" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-18 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
