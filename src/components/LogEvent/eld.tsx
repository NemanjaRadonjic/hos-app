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

type EldProps = {
  _id: HosEvent["_id"];
  eld: HosEvent["eld"];
};
export function Eld({ _id, eld }: EldProps) {
  const { updateEvent } = useTransactionContext();
  const copyEld = useAppClipboardStore((s) => s.copyEld);
  const eldData = useAppClipboardStore((s) => s.data.eld);
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <TableCell className="text-xs">{eld?.sn.slice(-4)}</TableCell>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>Eld:</ContextMenuLabel>
        <ContextMenuItem disabled={!eld} onClick={() => copyEld(eld)}>
          Copy eld
        </ContextMenuItem>

        <ContextMenuItem
          disabled={!eldData}
          onClick={() => {
            if (!eldData) return;

            updateEvent(_id, (prev) => ({ ...prev, eld: eldData }));
          }}
        >
          Paste eld
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
