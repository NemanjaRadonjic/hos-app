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

type IssueSeverity = "error" | "warning" | null;

type EngineHoursProps = {
  event: HosEvent;
  delta?: number | null;
  issueSeverity: IssueSeverity;
};

export const EngineHours = ({
  event,
  delta,
  issueSeverity,
}: EngineHoursProps) => {
  const { updateEvent } = useTransactionContext();
  const copyEngineHours = useAppClipboardStore((s) => s.copyEngineHours);
  const engineHoursData = useAppClipboardStore((s) => s.data.engineHours);

  return (
    <TableCell className="tabular-nums">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex w-full items-center gap-2">
            <span
              className={cn(
                issueSeverity === "error" && "text-error-fg font-semibold",
              )}
            >
              {event.totalEngineHours}
            </span>

            {delta != null && delta !== 0 && (
              <div
                className={cn(
                  "text-success-fg font-semibold",
                  issueSeverity === "error" && "text-error-fg",
                  issueSeverity === "warning" && "text-warning-bg",
                )}
              >
                ({delta > 0 ? "+" : ""}
                {delta.toFixed(1)})
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="p-2">
          <ContextMenuLabel>Engine hours:</ContextMenuLabel>

          <ContextMenuItem
            disabled={event.totalEngineHours == null}
            onClick={() => {
              if (event.totalEngineHours == null) return;

              copyEngineHours(event.totalEngineHours);
            }}
          >
            Copy engine hours
          </ContextMenuItem>

          <ContextMenuItem
            disabled={engineHoursData == null}
            onClick={() => {
              if (engineHoursData == null) return;

              updateEvent(event._id, (prev) => ({
                ...prev,
                totalEngineHours: engineHoursData,
              }));
            }}
          >
            Paste engine hours
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </TableCell>
  );
};
