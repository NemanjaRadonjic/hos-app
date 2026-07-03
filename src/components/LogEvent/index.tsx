import { Checkbox } from "../ui/checkbox";
import { TableCell, TableRow } from "../ui/table";
import { DateTime, Duration } from "luxon";
import { ICON_SIZES, ORIGIN_MAP, TZ_MAP } from "@/lib/maps";
import { Badge } from "../ui/badge";
import type { HosEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { getNoteIcons } from "@/lib/helpers";
import EventCode from "./event-code";
import { memo } from "react";
import type { EventInfo } from "@/routes/drivers/$driverId";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  BiError,
  BiSolidDuplicate,
  BiSolidMessageSquareEdit,
  BiSolidTrashAlt,
} from "react-icons/bi";
import { Location } from "./location";
import { useTransactionContext } from "@/lib/hooks/TransactionContext";
import { toast } from "sonner";
import {
  isServerLockedEvent,
  isUserLockedEvent,
} from "@/lib/hooks/useTransaction";
import { FaLock, FaUnlock } from "react-icons/fa6";
import { MdError } from "react-icons/md";

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
  const { duplicateEvent, deleteEvents, updateEvent } = useTransactionContext();
  const tz = event.eventTime.logDate.timeZone.id;
  const handleDuplicateEvent = (event: HosEvent) => {
    const newTimestamp = event.eventTime.timestamp + 1000;

    const originalDay = DateTime.fromMillis(event.eventTime.timestamp).toFormat(
      "yyyy/MM/dd",
    );

    const newDay = DateTime.fromMillis(newTimestamp).toFormat("yyyy/MM/dd");

    if (originalDay !== newDay) {
      toast.error("Cannot duplicate event into the next day.");
      return;
    }

    const duplicatedEvent = duplicateEvent({
      ...event,
      eventTime: {
        ...event.eventTime,
        timestamp: newTimestamp,
      },
    });
    return duplicatedEvent;
  };

  const icons = getNoteIcons(event.eventComment);
  const badgeIcons = [
    ...(icons?.inlineIcons ?? []),
    ...(icons?.noteIcons ?? []),
  ];

  const groupedIssues = eventInfo.issues.reduce(
    (acc, issue) => {
      (acc[issue.group] ??= []).push(issue);
      return acc;
    },
    {} as Record<string, typeof eventInfo.issues>,
  );

  const isLocked = isServerLockedEvent(event);
  const isUserLocked = isUserLockedEvent(event);

  const unlockUserLockedEvent = () =>
    updateEvent(event._id, () => {
      const { eventComment, ...rest } = event;

      return rest;
    });

  const isLocationError = eventInfo.issues.some(
    (issue) => issue.group === "Location",
  );

  const isOdometerError = eventInfo.issues.some(
    (issue) => issue.group === "Odometer",
  );

  const isEngineHoursError = eventInfo.issues.some(
    (issue) => issue.group === "Engine Hours" && issue.severity === "error",
  );

  const isEngineHoursWarning = eventInfo.issues.some(
    (issue) => issue.group === "Engine Hours" && issue.severity === "warning",
  );

  const isEngineHoursIssue = eventInfo.issues.some(
    (issue) => issue.group === "Engine Hours",
  );

  const isOriginError = eventInfo.issues.some(
    (issue) => issue.group === "Origin",
  );
  const engineHoursIssueSeverity = eventInfo.issues.some(
    (i) => i.group === "Engine Hours" && i.severity === "error",
  )
    ? "error"
    : eventInfo.issues.some(
          (i) => i.group === "Engine Hours" && i.severity === "warning",
        )
      ? "warning"
      : null;

  // checks if any of the errors are severity error
  const hasError = eventInfo.issues.some((i) => i.severity === "error");
  return (
    <TableRow
      key={event._id}
      id={`row-${event._id}`}
      style={{
        transitionDelay: focused ? "0ms" : "0ms",
      }}
      className={cn(
        "border-l-2 text-xs transition-all duration-200",

        isLocked
          ? "bg-muted hover:bg-muted"
          : focused
            ? eventInfo.hasError
              ? "border-l-error-fg bg-error-fg/15 hover:bg-error-fg/20 shadow-sm"
              : "bg-indigo-100 shadow-sm hover:bg-blue-200 dark:bg-blue-900/70"
            : eventInfo.hasError
              ? "border-l-error-fg bg-error-bg hover:bg-error-bg/80"
              : "hover:bg-muted/50",
      )}
      onClick={() => {
        setFocusedId(event._id);
      }}
    >
      <TableCell
        onClick={(e) => {
          e.stopPropagation();
          onCheckboxClick(e);
        }}
        className="cursor-pointer"
      >
        <Checkbox checked={checked} />
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
        {formatTimestampEvent(event.eventTime.timestamp, tz)}
      </TableCell>
      <TableCell>
        {eventInfo.duration != null && eventInfo.duration > 0 && (
          <Badge variant="secondary" className="bg-transparent text-gray-600">
            {msToHoursMinutes(eventInfo.duration)}
          </Badge>
        )}
      </TableCell>
      <EventCode event={event} setEditingEvent={setEditingEvent} />
      <TableCell className="text-muted-foreground flex max-w-[400px] gap-2 truncate">
        <Location isLocationError={isLocationError} event={event} />
      </TableCell>
      <TableCell>
        {!!eventInfo.issues.length && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`${hasError ? "text-error-fg" : "text-warning-bg"} flex items-center gap-1`}
              >
                <MdError />
                {eventInfo.issues.length}
              </span>
            </TooltipTrigger>

            <TooltipContent side="top" className="mb-2 min-w-fit">
              <div className="my-1 min-w-[250px] space-y-3">
                {Object.entries(groupedIssues).map(([group, issues]) => (
                  <div key={group}>
                    <div className="mb-1 border-b pb-1 text-xs font-semibold tracking-wide uppercase">
                      {group}
                    </div>

                    <ul className="space-y-1 text-sm">
                      {issues.map((issue, i) => (
                        <li
                          key={`${issue.code}-${issue.eventId ?? issue.logDate}-${i}`}
                          className="flex items-center gap-2"
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              issue.severity === "error" && "bg-error-fg",
                              issue.severity === "warning" && "bg-warning",
                            )}
                          />
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
      <TableCell
        className={cn(
          "text-muted-foreground text-center text-xs",
          isOriginError && "text-error-fg",
        )}
      >
        {ORIGIN_MAP[event.recordOrigin?.id]}
      </TableCell>
      <TableCell className="tabular-nums">
        <div className="flex items-center gap-2">
          <span className={cn(isOdometerError && "text-error-fg")}>
            {event.totalVehicleMiles}
          </span>

          {eventInfo.odoDelta != null && eventInfo.odoDelta !== 0 && (
            <div
              className={cn(
                "font-bold",
                eventInfo.odoDelta < 0 ? "text-error-fg" : "text-success-fg",
              )}
            >
              ({eventInfo.odoDelta > 0 ? "+" : ""}
              {eventInfo.odoDelta})
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="tabular-nums">
        <div className="flex items-center gap-2">
          <span className={cn(isEngineHoursError && "text-error-fg")}>
            {event.totalEngineHours}
          </span>
          {eventInfo.engHoursDelta != null && eventInfo.engHoursDelta !== 0 && (
            <div
              className={cn(
                "text-success-fg font-bold",
                engineHoursIssueSeverity === "error" && "text-error-fg",
                engineHoursIssueSeverity === "warning" && "text-warning-bg",
              )}
            >
              ({eventInfo.engHoursDelta > 0 ? "+" : ""}
              {eventInfo.engHoursDelta.toFixed(1)})
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {event.eventComment && (
          <Badge variant="outline" className="[&>svg]:size-auto">
            {badgeIcons.map(({ Icon, color, size }, i) => (
              <Icon
                key={i}
                color={color}
                size={(size ?? ICON_SIZES.default) - 4}
              />
            ))}
            {event.eventComment}
          </Badge>
        )}
      </TableCell>
      <TableCell className="flex items-center justify-center gap-2 text-lg">
        {isLocked ? (
          <FaLock className="text-muted-foreground size-4" />
        ) : isUserLocked ? (
          <button
            onClick={unlockUserLockedEvent}
            className="group cursor-pointer"
          >
            <FaLock className="size-4 group-hover:hidden" />
            <FaUnlock className="hidden size-4 text-blue-500 group-hover:block" />
          </button>
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
              onClick={() => deleteEvents(event._id)}
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
