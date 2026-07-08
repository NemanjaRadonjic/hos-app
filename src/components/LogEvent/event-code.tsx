import { EVENT_BADGE_COLORS, mainEventCodes, EVENT_CODE_MAP } from "@/lib/maps";
import { Badge } from "../ui/badge";
import { TableCell } from "../ui/table";
import type { HosEvent } from "@/lib/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "../ui/context-menu";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";

import { MdEditDocument } from "react-icons/md";
import { HiDocumentDuplicate } from "react-icons/hi2";
import { cn } from "@/lib/utils";
import { FaCut } from "react-icons/fa";
import { BiSolidTrashAlt } from "react-icons/bi";

import StatusBadge from "../ui/status-badge";
import { isInterlocationEvent } from "@/lib/log-check/helpers/status-type-checks";

type EventAction = "SET_DS_OFF" | "SET_DS_SB" | "SET_DS_ON" | "CUT_EVENT";

const getAvailableActions = (event: HosEvent): EventAction[] => {
  const code = event.eventCode.id;

  const setActions: EventAction[] =
    code === "DS_OFF"
      ? ["SET_DS_SB", "SET_DS_ON"]
      : code === "DS_SB"
        ? ["SET_DS_OFF", "SET_DS_ON"]
        : code === "DS_ON"
          ? ["SET_DS_OFF", "SET_DS_SB"]
          : [];

  const actions: EventAction[] = [...setActions];

  if (isInterlocationEvent(event)) {
    actions.push("CUT_EVENT");
  }

  return actions;
};

const renderAction = (action: EventAction) => {
  switch (action) {
    case "SET_DS_OFF":
      return <StatusBadge status="DS_OFF" />;
    case "SET_DS_SB":
      return <StatusBadge status="DS_SB" />;
    case "SET_DS_ON":
      return <StatusBadge status="DS_ON" />;
    case "CUT_EVENT":
      return (
        <>
          <FaCut /> Cut Interlocation
        </>
      );
    default:
      return action;
  }
};

export default function EventCode({ event }: { event: HosEvent }) {
  const { updateEvent } = useTransactionContext();
  const code = event.eventCode.id;
  const label = code.includes("CERT")
    ? `${EVENT_CODE_MAP[code]} ${event.certifiedRecordLogDate?.date}`
    : EVENT_CODE_MAP[code];

  const actions = getAvailableActions(event);

  const executeAction = (event: HosEvent, action: EventAction) => {
    switch (action) {
      case "SET_DS_OFF":
      case "SET_DS_SB":
      case "SET_DS_ON":
        return updateEvent(event._id, (e) => ({
          ...e,
          eventCode: {
            ...e.eventCode,
            id: action.replace("SET_", ""),
          },
        }));

      case "CUT_EVENT":
        return console.log("cut xd");

      default:
        return;
    }
  };

  return (
    <TableCell className="py-0">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-full w-full items-center">
            <Badge className={cn(EVENT_BADGE_COLORS[code])}>
              {mainEventCodes.includes(code) && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: `var(--hos-${code}-fg)` }}
                />
              )}
              {label}
            </Badge>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuLabel>Quick edits:</ContextMenuLabel>
          {actions.map((action) => (
            <ContextMenuItem
              key={action}
              onClick={() => executeAction(event, action)}
            >
              {renderAction(action)}
            </ContextMenuItem>
          ))}
        </ContextMenuContent>
      </ContextMenu>
    </TableCell>
  );
}
