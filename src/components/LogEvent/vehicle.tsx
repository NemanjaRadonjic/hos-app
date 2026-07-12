import type { HosEvent } from "@/lib/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { TableCell } from "../ui/table";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { useAppClipboardStore } from "@/lib/store/useAppClipboard";

type VehicleProps = {
  _id: HosEvent["_id"];
  vehicle: HosEvent["vehicle"];
};
export function Vehicle({ _id, vehicle }: VehicleProps) {
  const { updateEvent } = useTransactionContext();
  const copyVehicle = useAppClipboardStore((s) => s.copyVehicle);
  const vehicleData = useAppClipboardStore((s) => s.data.vehicle);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableCell className="text-xs">{vehicle?.name}</TableCell>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>Vehicle:</ContextMenuLabel>
        <ContextMenuItem
          disabled={!vehicle}
          onClick={() => copyVehicle(vehicle)}
        >
          Copy vehicle
        </ContextMenuItem>

        <ContextMenuItem
          disabled={!vehicleData}
          onClick={() => {
            if (!vehicleData) return;
            updateEvent(_id, (prev) => ({ ...prev, vehicle: vehicleData }));
          }}
        >
          Paste vehicle
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
