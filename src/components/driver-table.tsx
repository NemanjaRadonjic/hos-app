import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Badge } from "./ui/badge";
import { useMemo, useState } from "react";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { EVENT_CODE_MAP } from "@/lib/maps";
import { HosGauge } from "./hos-gauge";
import type { DriverTableData } from "@/routes";
import "@tanstack/react-table";
import type { DriverSimplified } from "@/lib/hooks/useDriversData";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
  }
}

const columns: ColumnDef<DriverSimplified>[] = [
  {
    accessorKey: "name",
    header: "Driver",
  },
  { accessorKey: "vehicle.name", header: "Vehicle" },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      headerClassName: "text-center",
      cellClassName: "text-center",
    },
    cell: ({ row }) => {
      const s = row.getValue<string>("status");

      return (
        <Badge
          style={{
            backgroundColor: `var(--hos-${s}-bg)`,
            color: `var(--hos-${s}-fg)`,
          }}
        >
          {EVENT_CODE_MAP[s]}
        </Badge>
      );
    },
  },
  {
    header: "Location",
    accessorKey: "location",
    cell: ({ row }) => row.getValue<string>("location"),
  },
  {
    header: "Break",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.breakTime.limitTime - row.breakTime.accumulatedTime,
    cell: ({ row }) => (
      <HosGauge
        value={row.original.breakTime.accumulatedTime}
        max={row.original.breakTime.limitTime}
        label="Break"
        color="var(--break)"
      />
    ),
  },
  {
    header: "Drive",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.driveTime.limitTime - row.driveTime.accumulatedTime,
    cell: ({ row }) => (
      <HosGauge
        value={row.original.driveTime.accumulatedTime}
        max={row.original.driveTime.limitTime}
        label="Drive"
        color="var(--hos-DS_D-bg)"
      />
    ),
  },
  {
    header: "Shift",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.shiftTime.limitTime - row.shiftTime.accumulatedTime,
    cell: ({ row }) => (
      <HosGauge
        value={row.original.shiftTime.accumulatedTime}
        max={row.original.shiftTime.limitTime}
        label="Shift"
        color="var(--hos-DS_ON-bg)"
      />
    ),
  },
  {
    header: "Cycle",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.cycleTime.limitTime - row.cycleTime.accumulatedTime,
    cell: ({ row }) => (
      <HosGauge
        value={row.original.cycleTime.accumulatedTime}
        max={row.original.cycleTime.limitTime}
        label="Cycle"
        color="var(--cycle)"
      />
    ),
  },
];

export function DriverTable({ data }: { data: DriverSimplified[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    const searchTerm = search.toLowerCase();

    return data.filter((driver) => {
      console.log({ driver });
      return (
        driver.name.toLowerCase().includes(searchTerm) ||
        driver.vehicle.name.toLowerCase().includes(searchTerm)
      );
    });
  }, [data, search]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search drivers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className={`cursor-pointer ${
                      h.column.columnDef.meta?.headerClassName ?? ""
                    }`}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {{ asc: " ↑", desc: " ↓" }[
                      h.column.getIsSorted() as string
                    ] ?? ""}
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
                  window.open(`/drivers/${row.original.id}`, "_blank")
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.columnDef.meta?.cellClassName ?? ""}
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
