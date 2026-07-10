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
import { msToHHMM } from "./hos-gauge";
import "@tanstack/react-table";
import type { DriverSimplified } from "@/lib/hooks/useDriversData";
import { MdSignalWifi4Bar, MdSignalWifiBad } from "react-icons/md";
import { DateTime } from "luxon";
import { formatTimestampEvent } from "./LogEvent";
import { checkKnownLocation } from "@/lib/helpers/check-known-location";

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
    cell: ({ row }) => {
      const location = row.original.location;

      if (!location) {
        return null;
      }
      const knownLocation = checkKnownLocation(row.original.location);
      if (knownLocation) {
        return (
          <div className="flex gap-2">
            {location.calculatedLocation}
            {knownLocation && (
              <Badge variant="outline">{knownLocation.location.type}</Badge>
            )}
          </div>
        );
      }

      return location.calculatedLocation;
    },
  },
  {
    header: "Break",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.breakTime.limitTime - row.breakTime.accumulatedTime,
    cell: ({ row }) => {
      const remaining = Math.max(
        row.original.breakTime.limitTime -
          row.original.breakTime.accumulatedTime,
        0,
      );
      return (
        <div className="text-center font-semibold">{msToHHMM(remaining)}</div>
      );
    },
  },
  {
    header: "Drive",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.driveTime.limitTime - row.driveTime.accumulatedTime,
    cell: ({ row }) => {
      const remaining = Math.max(
        row.original.driveTime.limitTime -
          row.original.driveTime.accumulatedTime,
        0,
      );
      return (
        <div className="text-center font-semibold">{msToHHMM(remaining)}</div>
      );
    },
  },
  {
    header: "Shift",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.shiftTime.limitTime - row.shiftTime.accumulatedTime,
    cell: ({ row }) => {
      const remaining = Math.max(
        row.original.shiftTime.limitTime -
          row.original.shiftTime.accumulatedTime,
        0,
      );
      return (
        <div className="text-center font-semibold">{msToHHMM(remaining)}</div>
      );
    },
  },
  {
    header: "Cycle",
    meta: {
      headerClassName: "text-center",
    },
    accessorFn: (row) =>
      row.cycleTime.limitTime - row.cycleTime.accumulatedTime,
    cell: ({ row }) => {
      const remaining = Math.max(
        row.original.cycleTime.limitTime -
          row.original.cycleTime.accumulatedTime,
        0,
      );
      return (
        <div className="text-center font-semibold">{msToHHMM(remaining)}</div>
      );
    },
  },
  {
    header: "ELD",

    accessorFn: (row) => row.isConnected,
    meta: {
      headerClassName: "text-center",
      cellClassName: "flex justify-center",
    },
    cell: ({ row }) =>
      row.original.isConnected ? (
        <Badge
          variant="success_filled"
          className="flex items-center gap-2 shadow-sm"
        >
          <MdSignalWifi4Bar size={24} /> Connected
        </Badge>
      ) : (
        <Badge variant="error_filled">
          <MdSignalWifiBad
            size={24}
            className="flex items-center gap-2 shadow-sm"
          />{" "}
          Disconnected
        </Badge>
      ),
  },
  {
    header: "Updated",
    accessorFn: (row) => row.updatedAt,
    cell: ({ row }) => (
      <div className="text-xs">
        {DateTime.fromMillis(row.original.updatedAt)
          .setZone("America/Chicago")
          .toRelative()}{" "}
        - {formatTimestampEvent(row.original.updatedAt)}
      </div>
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
