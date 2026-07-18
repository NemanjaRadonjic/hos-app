import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SKELETON_ROWS = 12;

const TRANSACTION_COLUMN_SIZES = [
  180, // Driver
  190, // Range
  40, // Added
  40, // Deleted
  40, // Updated
  40, // Events
  40, // Logs
  110, // Max time shift
  130, // Status
  150, // Time
];

export function TransactionsTableSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-72" />

        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: TRANSACTION_COLUMN_SIZES[0] }}>
                Driver
              </TableHead>

              <TableHead style={{ width: TRANSACTION_COLUMN_SIZES[1] }}>
                Range
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[2] }}
                className="text-center"
              >
                Added
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[3] }}
                className="text-center"
              >
                Deleted
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[4] }}
                className="text-center"
              >
                Updated
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[5] }}
                className="text-center"
              >
                Events
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[6] }}
                className="text-center"
              >
                Logs
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[7] }}
                className="text-center"
              >
                Max time shift
              </TableHead>

              <TableHead
                style={{ width: TRANSACTION_COLUMN_SIZES[8] }}
                className="text-center"
              >
                Status
              </TableHead>

              <TableHead style={{ width: TRANSACTION_COLUMN_SIZES[9] }}>
                Time
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {Array.from({ length: SKELETON_ROWS }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell style={{ width: TRANSACTION_COLUMN_SIZES[0] }}>
                  <Skeleton className="h-4 w-28" />
                </TableCell>

                <TableCell style={{ width: TRANSACTION_COLUMN_SIZES[1] }}>
                  <Skeleton className="h-4 w-40" />
                </TableCell>

                {TRANSACTION_COLUMN_SIZES.slice(2, 7).map((size, index) => (
                  <TableCell
                    key={index}
                    style={{ width: size }}
                    className="text-center"
                  >
                    <Skeleton className="mx-auto h-4 w-5" />
                  </TableCell>
                ))}

                <TableCell
                  style={{ width: TRANSACTION_COLUMN_SIZES[7] }}
                  className="text-center"
                >
                  <Skeleton className="mx-auto h-4 w-14" />
                </TableCell>

                <TableCell
                  style={{ width: TRANSACTION_COLUMN_SIZES[8] }}
                  className="text-center"
                >
                  <Skeleton className="mx-auto h-5 w-20 rounded-full" />
                </TableCell>

                <TableCell style={{ width: TRANSACTION_COLUMN_SIZES[9] }}>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
