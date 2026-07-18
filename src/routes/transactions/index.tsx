import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTransactions } from "@/lib/api";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DateTime } from "luxon";
import { Button } from "@/components/ui/button";
import { BiRefresh } from "react-icons/bi";
import { TransactionsTableSkeleton } from "@/components/skeletons/transactions";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import DriverSelect from "@/components/LogHead/driver-select";

export const TRANSACTION_STATUS_CLASSES = {
  pending: "bg-slate-500 text-white border-slate-500",

  processing: "bg-blue-600 text-white border-blue-600",

  success: "bg-emerald-600 text-white border-emerald-600",

  partial_failure: "bg-amber-500 text-white border-amber-500",

  failed: "bg-red-600 text-white border-red-600",
} as const;

export const Route = createFileRoute("/transactions/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [driverId, setDriverId] = useState<string | undefined>();
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [
      "transactions",
      {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        driverId: driverId ?? null,
      },
    ],
    queryFn: () =>
      getTransactions({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        driverId,
      }),
    placeholderData: (previousData) => previousData,
  });

  const transactions = data?.transactions ?? [];
  const rowCount = data?.rowCount ?? 0;

  const { drivers, isLoading: isDriversLoading } = useDriversData();

  const columns = useMemo<ColumnDef<(typeof transactions)[number]>[]>(
    () => [
      {
        accessorKey: "driver_id",
        header: "Driver",
        size: 180,
        cell: ({ row }) => {
          const driver = drivers.find((d) => d.id === row.original.driver_id);

          return driver?.name ?? row.original.driver_id;
        },
      },
      {
        accessorKey: "from_date",
        header: "Range",
        size: 190,
        meta: {
          cellClassName: "text-xs font-semibold",
        },
        cell: ({ row }) =>
          `${row.original.from_date} - ${row.original.to_date}`,
      },
      {
        accessorKey: "added_event_count",
        header: "Added",
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-xs",
        },
      },
      {
        accessorKey: "deleted_event_count",
        header: "Deleted",
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-xs",
        },
      },
      {
        accessorKey: "updated_event_count",
        header: "Updated",
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-xs",
        },
      },
      {
        accessorKey: "event_change_count",
        header: "Events",
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-xs",
        },
      },
      {
        accessorKey: "log_change_count",
        header: "Logs",
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-xs",
        },
      },
      {
        accessorKey: "max_time_shift_ms",
        header: "Max time shift",
        size: 110,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-xs",
        },
        cell: ({ row }) => formatShift(row.original.max_time_shift_ms),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 130,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        cell: ({ row }) => (
          <Badge
            className={cn(
              "capitalize",
              TRANSACTION_STATUS_CLASSES[row.original.status],
            )}
          >
            {row.original.status.replace("_", " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Time",
        size: 150,
        meta: {
          cellClassName:
            "text-muted-foreground text-xs whitespace-nowrap overflow-hidden text-ellipsis",
        },
        cell: ({ row }) => {
          const created = DateTime.fromISO(row.original.created_at).setZone(
            "America/Chicago",
          );

          return `${created.toRelative() ?? ""} · ${created.toFormat(
            "MMM dd, yyyy hh:mm:ss a",
          )}`;
        },
      },
    ],
    [drivers],
  );

  const table = useReactTable({
    data: transactions,
    columns,

    state: {
      sorting,
      pagination,
    },

    onSortingChange: setSorting,
    onPaginationChange: setPagination,

    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),

    manualPagination: true,
    rowCount,
  });

  if (isLoading || isDriversLoading || isFetching) {
    return <TransactionsTableSkeleton />;
  }

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <DriverSelect
            onSelect={(value) => setDriverId(value)}
            driverId={driverId}
            nullable={true}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-between gap-4">
            <div className="text-muted-foreground text-sm">
              {rowCount === 0
                ? "No transactions"
                : `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min(
                    (pagination.pageIndex + 1) * pagination.pageSize,
                    rowCount,
                  )} of ${rowCount} transactions`}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-medium">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {Math.max(table.getPageCount(), 1)}
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!table.getCanPreviousPage() || isFetching}
                  onClick={() => table.firstPage()}
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!table.getCanPreviousPage() || isFetching}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!table.getCanNextPage() || isFetching}
                  onClick={() => table.nextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!table.getCanNextPage() || isFetching}
                  onClick={() => table.lastPage()}
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <Button disabled={isFetching} onClick={() => refetch()}>
            <BiRefresh /> Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.getSize(),
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      "cursor-pointer",
                      header.column.columnDef.meta?.headerClassName,
                    )}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate({
                    to: "/transactions/$transactionId",
                    params: {
                      transactionId: row.original.id,
                    },
                  })
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(cell.column.columnDef.meta?.cellClassName)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const formatShift = (ms: number) => {
  const minutes = Math.round(ms / 60_000);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};
