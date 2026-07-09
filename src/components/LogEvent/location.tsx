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
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useAppClipboardStore } from "@/lib/store/useAppClipboard";
import { toast } from "sonner";

type LocationProps = {
  event: HosEvent;
  isLocationError: boolean;
};

export const Location = ({ event, isLocationError }: LocationProps) => {
  const { updateEvent } = useTransactionContext();
  const { canPasteLocation, copyLocation, resolveLocation } =
    useAppClipboardStore((s) => s);

  const disabled = event.i;
  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={disabled} asChild>
        <div className={cn(isLocationError && "text-error-fg")}>
          {event.location ? (
            <div className="flex items-center gap-4">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="cursor-pointer transition-colors hover:text-blue-500">
                    <FaMapMarkedAlt size={16} />
                  </button>
                </DialogTrigger>

                <DialogContent className="h-[60vh] w-[60vw] max-w-[100vw] p-0">
                  <iframe
                    src={`https://www.google.com/maps?q=${event.location.lat},${event.location.lon}&z=17&t=k&output=embed`}
                    className="h-full w-full rounded-lg"
                  />
                  <div className="absolute top-2 left-1/2 -translate-x-1/2">
                    <Button
                      variant="ghost"
                      className="bg-white/80 text-black hover:bg-white"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps?q=${event.location.lat},${event.location.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Google Maps
                      </a>
                    </Button>
                  </div>
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
            copyLocation(event.location);
          }}
        >
          Copy location
        </ContextMenuItem>

        <ContextMenuItem
          onClick={async () => {
            const location = await resolveLocation();
            if (location) {
              updateEvent(event._id, (prev) => ({
                ...prev,
                location: {
                  ...prev.location,
                  ...location,
                  source: prev.location?.source ?? "E",
                  timestamp:
                    prev.location?.timestamp ?? event.eventTime.timestamp,
                },
              }));
            } else {
              toast.error("Couldn't generate a location.");
            }
          }}
        >
          Paste location
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
