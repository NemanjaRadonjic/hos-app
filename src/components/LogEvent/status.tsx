import type { HosEvent } from "@/lib/types";
import { STATUS_MAP_SHORT, STATUS_MAP } from "@/lib/maps";
import { cn } from "@/lib/utils";
import { TableCell } from "../ui/table";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";

type StatusProps = {
  event: HosEvent;
  hasError: boolean;
};

export const Status = ({ event, hasError }: StatusProps) => {
  const { updateEvent } = useTransactionContext();
  return (
    <TableCell
      className={cn(
        "text-muted-foreground truncate text-center text-xs",
        hasError && "text-error-fg font-semibold",
      )}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="w-full">
            {STATUS_MAP_SHORT[event.recordStatus?.id]}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuLabel>Quick edits:</ContextMenuLabel>
          {Object.entries(STATUS_MAP).map(([value, label]) => (
            <ContextMenuItem
              key={value}
              onClick={() => {
                updateEvent(event._id, (prev) => ({
                  ...prev,
                  recordStatus: {
                    id: value,
                  },
                }));
              }}
            >
              {label}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    </TableCell>
  );
};
