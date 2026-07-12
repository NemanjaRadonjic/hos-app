import type { HosEvent } from "@/lib/types";
import { ORIGIN_MAP_SHORT, ORIGIN_MAP } from "@/lib/maps";
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

type OriginProps = {
  event: HosEvent;
  hasError: boolean;
};

export const Origin = ({ event, hasError }: OriginProps) => {
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
            {ORIGIN_MAP_SHORT[event.recordOrigin?.id]}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuLabel>Quick edits:</ContextMenuLabel>
          {Object.entries(ORIGIN_MAP).map(([value, label]) => (
            <ContextMenuItem
              key={value}
              onClick={() => {
                updateEvent(event._id, (prev) => ({
                  ...prev,
                  recordOrigin: {
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
