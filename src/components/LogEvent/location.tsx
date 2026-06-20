import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { FaMapMarkedAlt } from "react-icons/fa";
import type { HosEvent } from "@/lib/types";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";

type LocationProps = {
  event: HosEvent;
};

export const Location = ({ event }: LocationProps) => {
  const { updateEvent } = useTransactionContext();
  const disabled = event.i;
  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={disabled} asChild>
        <div>
          {event.location ? (
            <div className="flex items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                    <FaMapMarkedAlt size={16} />
                  </button>
                </DialogTrigger>

                <DialogContent className="h-[60vh] w-[60vw] max-w-[100vw] p-0">
                  <iframe
                    src={`https://www.google.com/maps?q=${event.location.lat},${event.location.lon}&z=18&t=k&output=embed`}
                    className="h-full w-full rounded-lg"
                  />
                </DialogContent>
              </Dialog>

              {event.location.calculatedLocation}
            </div>
          ) : (
            event.driverLocationDescription
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="p-2">
        <ContextMenuLabel>Location:</ContextMenuLabel>
        <ContextMenuItem
          disabled={!event.location}
          onClick={() => {
            if (!event.location) return;
            navigator.clipboard.writeText(JSON.stringify(event.location));
          }}
        >
          Copy location
        </ContextMenuItem>

        <ContextMenuItem
          onClick={async () => {
            const text = await navigator.clipboard.readText();

            try {
              const location = JSON.parse(text);

              updateEvent(event._id, (prev) => ({
                ...prev,
                location,
              }));
            } catch {
              console.error(
                "Clipboard does not contain a valid location object.",
              );
            }
          }}
        >
          Paste location
        </ContextMenuItem>

        <ContextMenuItem
          disabled={!event.location}
          onClick={() => {
            if (!event.location) return;

            navigator.clipboard.writeText(
              `${event.location.lat},${event.location.lon}`,
            );
          }}
        >
          Copy coordinates
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
