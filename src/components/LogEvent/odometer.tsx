import type { HosEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { useAppClipboardStore } from "@/lib/store/useAppClipboard";
import { TableCell } from "../ui/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "../ui/context-menu";

type OdometerProps = {
  event: HosEvent;
  delta?: number | null;
  hasError: boolean;
};

export const Odometer = ({ event, delta, hasError }: OdometerProps) => {
  const { updateEvent } = useTransactionContext();
  const copyOdometer = useAppClipboardStore((s) => s.copyOdometer);
  const odometerData = useAppClipboardStore((s) => s.data.odometer);

  return (
    <TableCell className="tabular-nums">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex w-full items-center gap-2">
            <span className={cn(hasError && "text-error-fg font-semibold")}>
              {event.totalVehicleMiles}
            </span>

            {delta != null && delta !== 0 && (
              <div
                className={cn(
                  "font-semibold",
                  delta < 0 ? "text-error-fg" : "text-success-fg",
                )}
              >
                ({delta > 0 ? "+" : ""}
                {delta})
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="p-2">
          <ContextMenuLabel>Odometer:</ContextMenuLabel>

          <ContextMenuItem
            disabled={event.totalVehicleMiles == null}
            onClick={() => {
              if (event.totalVehicleMiles == null) return;

              copyOdometer(event.totalVehicleMiles);
            }}
          >
            Copy odometer
          </ContextMenuItem>

          <ContextMenuItem
            disabled={odometerData == null}
            onClick={() => {
              if (odometerData == null) return;

              updateEvent(event._id, (prev) => ({
                ...prev,
                totalVehicleMiles: odometerData,
              }));
            }}
          >
            Paste odometer
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </TableCell>
  );
};
