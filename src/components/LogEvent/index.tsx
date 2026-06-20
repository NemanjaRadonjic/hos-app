import { Checkbox } from "../ui/checkbox";
import { TableCell, TableRow } from "../ui/table";
import { DateTime, Duration } from "luxon";
import { ORIGIN_MAP, TZ_MAP } from "@/lib/maps";
import { Badge } from "../ui/badge";
import type { HosEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { getNoteIcons } from "@/lib/helpers";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { FaLock, FaMapMarkedAlt } from "react-icons/fa";
import EventCode from "./event-code";
import { memo } from "react";
import type { EventInfo } from "@/routes/drivers/$driverId";
import { MdEditDocument, MdError } from "react-icons/md";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  BiDuplicate,
  BiError,
  BiSolidDuplicate,
  BiSolidMessageSquareEdit,
  BiSolidTrashAlt,
} from "react-icons/bi";
import { Location } from "./location";
import { Edit } from "lucide-react";
import { IoRemove } from "react-icons/io5";
import { HiMiniDocumentDuplicate } from "react-icons/hi2";
import { HiDocumentRemove, HiDuplicate } from "react-icons/hi";
import { TbTrashFilled } from "react-icons/tb";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { toast } from "sonner";

interface LogEventProps {
  event: HosEvent;
  eventInfo: EventInfo;
  checked: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  focused: boolean;
  setFocusedId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingEvent: React.Dispatch<React.SetStateAction<HosEvent | null>>;
}

const formatTimestampEvent = (
  timestamp: number,
  tz: string = "America/Chicago",
) =>
  DateTime.fromMillis(timestamp)
    .setZone(TZ_MAP[tz])
    .toFormat("MMM dd, hh:mm:ss a");

export const formatDuration = (ms?: number | null) => {
  if (!ms || ms <= 0) return null;

  const d = Duration.fromMillis(ms).shiftTo("hours", "minutes", "seconds");

  const hours = Math.floor(d.hours);
  const minutes = Math.floor(d.minutes);
  const seconds = Math.floor(d.seconds);

  const parts: string[] = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
};

const LogEvent = ({
  event,
  eventInfo,
  checked,
  onCheckboxClick,
  focused,
  setFocusedId,
  setEditingEvent,
}: LogEventProps) => {
  const { createEvent, deleteEvent } = useTransactionContext();
  const tz = event.eventTime.logDate.timeZone.id;

  const duplicateEvent = (event: HosEvent) => {
    const newTimestamp = event.eventTime.timestamp + 1000;

    const originalDay = DateTime.fromMillis(event.eventTime.timestamp).toFormat(
      "yyyy/MM/dd",
    );

    const newDay = DateTime.fromMillis(newTimestamp).toFormat("yyyy/MM/dd");

    if (originalDay !== newDay) {
      toast.error("Cannot duplicate event into the next day.");
      return;
    }

    const duplicatedEvent = createEvent({
      ...event,
      eventTime: {
        ...event.eventTime,
        timestamp: newTimestamp,
      },
      eventComment: "",
    });
    return duplicatedEvent;
  };

  const icons = getNoteIcons(event.eventComment);

  const groupedIssues = eventInfo.issues.reduce(
    (acc, issue) => {
      (acc[issue.group] ??= []).push(issue);
      return acc;
    },
    {} as Record<string, typeof eventInfo.issues>,
  );

  return (
    <TableRow
      key={event._id}
      id={`row-${event._id}`}
      style={{
        transitionDelay: focused ? "0ms" : "0ms",
      }}
      className={cn(
        "text-xs transition-all duration-200",
        focused
          ? "bg-indigo-100 shadow-sm hover:bg-blue-200 dark:bg-blue-900/70"
          : "hover:bg-muted/50",
        // eventInfo.hasError && "bg-red-100",
        event.i && "bg-muted hover:bg-muted",
      )}
      onClick={() => {
        setFocusedId(event._id);
        console.log({ eventClicked: event });
      }}
    >
      <TableCell
        onClick={(e) => {
          e.stopPropagation();
          onCheckboxClick(e);
        }}
        className="cursor-pointer"
      >
        <Checkbox checked={checked} onCheckedChange={() => {}} />
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
        {formatTimestampEvent(event.eventTime.timestamp, tz)}
      </TableCell>
      <TableCell>
        {eventInfo.duration && (
          <Badge variant="secondary" className="bg-transparent text-gray-600">
            {eventInfo.duration != null
              ? msToHoursMinutes(eventInfo.duration)
              : ""}
          </Badge>
        )}
      </TableCell>
      <EventCode event={event} setEditingEvent={setEditingEvent} />
      <TableCell className="text-muted-foreground max-w-[200px] truncate">
        <Location event={event} />
      </TableCell>
      <TableCell>
        {!!eventInfo.issues.length && (
          <Tooltip>
            <TooltipTrigger asChild>
              <BiError
                size={18}
                className="rounded-sm bg-red-100 fill-red-500 p-[2px]"
              />
            </TooltipTrigger>

            <TooltipContent
              side="top"
              className="mb-2 min-w-fit border-red-500/30 bg-red-950 text-red-50"
            >
              <div className="my-1 min-w-[250px] space-y-3">
                {Object.entries(groupedIssues).map(([group, issues]) => (
                  <div key={group}>
                    <div className="mb-1 border-b border-red-500/20 pb-1 text-xs font-semibold tracking-wide text-red-300 uppercase">
                      {group}
                    </div>

                    <ul className="space-y-1 text-sm">
                      {issues.map((issue, i) => (
                        <li
                          key={`${issue.code}-${issue.eventId ?? issue.logDate}-${i}`}
                          className="flex items-center gap-2"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          <span>{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-center text-xs">
        {event.recordStatus?.id}
      </TableCell>
      <TableCell className="text-muted-foreground text-center text-xs">
        {ORIGIN_MAP[event.recordOrigin?.id]}
      </TableCell>
      <TableCell className="tabular-nums">
        <div className="flex items-center justify-between">
          <span className="">{event.totalVehicleMiles}</span>

          {eventInfo.odoDelta != null && eventInfo.odoDelta !== 0 && (
            <Badge
              variant={eventInfo.odoDelta < 0 ? "destructive" : "success"}
              className="shadow-xs"
            >
              {eventInfo.odoDelta > 0 ? "+" : ""}
              {eventInfo.odoDelta}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="tabular-nums">
        <div className="flex items-center justify-between">
          <span className="">{event.totalEngineHours}</span>
          {eventInfo.engHoursDelta != null && eventInfo.engHoursDelta !== 0 && (
            <Badge
              variant={eventInfo.engHoursDelta < 0 ? "destructive" : "success"}
              className="shadow-xs"
            >
              {eventInfo.engHoursDelta > 0 ? "+" : ""}
              {eventInfo.engHoursDelta.toFixed(1)}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {event.eventComment && (
          <Badge variant="outline" className="[&>svg]:size-auto">
            {icons?.icons.map(({ Icon, color, size }, i) => (
              <Icon key={i} color={color} size={size - 4} />
            ))}
            {event.eventComment}
          </Badge>
        )}
      </TableCell>
      <TableCell className="flex items-center justify-center gap-2 text-lg">
        {event.i ? (
          <FaLock className="text-muted-foreground size-4" />
        ) : (
          <>
            <BiSolidMessageSquareEdit
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-150"
              onClick={() => setEditingEvent(event)}
            />

            <BiSolidDuplicate
              className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                const duplicatedEvent = duplicateEvent(event);
                if (duplicatedEvent) {
                  setEditingEvent(duplicatedEvent);
                  setFocusedId(duplicatedEvent._id);
                }
              }}
            />

            <BiSolidTrashAlt
              className="text-muted-foreground hover:text-destructive cursor-pointer transition-colors duration-150"
              onClick={() => deleteEvent(event._id)}
            />
          </>
        )}
      </TableCell>
      <TableCell className="text-xs">{event.eld?.sn?.slice(-4)}</TableCell>
      <TableCell className="text-xs">{event.vehicle?.name}</TableCell>
      <TableCell className="text-xs">{parseInt(event.seqId, 16)}</TableCell>
    </TableRow>
  );
};

export default memo(LogEvent);
