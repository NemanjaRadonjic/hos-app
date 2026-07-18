import type { HosEvent } from "@/lib/types";
import {
  EVENT_BADGE_COLORS,
  EVENT_CODE_MAP,
  ICON_SIZES,
  mainEventCodes,
  ORIGIN_MAP_SHORT,
  STATUS_MAP_SHORT,
  TZ_MAP,
} from "@/lib/maps";
import { DateTime } from "luxon";
import { getNoteIcons } from "@/lib/helpers";
import type { EnrichedEvent } from "@/routes/drivers/helpers/enrich-events";
import { cn } from "@/lib/utils";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { checkKnownLocation } from "@/lib/helpers/check-known-location";

import { TableCell, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

import { MdError } from "react-icons/md";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { FaMapMarkedAlt } from "react-icons/fa";
import { Button } from "./ui/button";
import {
  isServerLockedEvent,
  isUserLockedEvent,
} from "@/lib/hooks/useTransaction";

type TransactionLogEventProps = {
  event: HosEvent;
  info: EnrichedEvent["info"];
  operation: "create" | "update" | "delete" | null;
  focused: boolean;
  focusEvent: (eventId: string) => void;
};

const formatTimestampEvent = (
  timestamp: number,
  tz: string = "America/Chicago",
) =>
  DateTime.fromMillis(timestamp)
    .setZone(TZ_MAP[tz])
    .toFormat("MMM dd, hh:mm:ss a");

export default function TransactionLogEvent({
  event,
  info,
  operation,
  focused,
  focusEvent,
}: TransactionLogEventProps) {
  const tz = event.eventTime.logDate.timeZone.id;

  const icons = getNoteIcons(event.eventComment);
  const badgeIcons = [
    ...(icons?.inlineIcons ?? []),
    ...(icons?.noteIcons ?? []),
  ];

  const groupedIssues = info.issues.reduce(
    (acc, issue) => {
      (acc[issue.group] ??= []).push(issue);
      return acc;
    },
    {} as Record<string, typeof info.issues>,
  );

  const knownLocation = checkKnownLocation(event.location);

  const isTimeError = info.issues.some((issue) => issue.group === "Time");

  const isLocationError = info.issues.some(
    (issue) => issue.group === "Location",
  );

  const isOdometerError = info.issues.some(
    (issue) => issue.group === "Odometer",
  );

  const isOriginError = info.issues.some((issue) => issue.group === "Origin");

  const isStatusError = info.issues.some((issue) => issue.group === "Status");

  const isIDError = info.issues.some((issue) => issue.group === "ID");

  const engineHoursIssueSeverity = info.issues.some(
    (issue) => issue.group === "Engine Hours" && issue.severity === "error",
  )
    ? "error"
    : info.issues.some(
          (issue) =>
            issue.group === "Engine Hours" && issue.severity === "warning",
        )
      ? "warning"
      : null;

  const hasError = info.issues.some((issue) => issue.severity === "error");

  const code = event.eventCode.id;
  const label = code.includes("CERT")
    ? `${EVENT_CODE_MAP[code]} ${event.certifiedRecordLogDate?.date}`
    : EVENT_CODE_MAP[code];

  const isServerLocked = isServerLockedEvent(event);
  const isUserLocked = isUserLockedEvent(event);

  return (
    <TableRow
      key={event._id}
      id={event._id}
      style={{
        transitionDelay: focused ? "0ms" : "0ms",
      }}
      className={cn(
        "text-md border-l-2 transition-all duration-200",

        operation === "create" && "bg-blue-500/10 hover:bg-blue-500/20",
        operation === "delete" && "bg-error/10 hover:bg-error/20",
        isServerLocked || isUserLocked
          ? "bg-muted hover:bg-muted"
          : focused
            ? operation
              ? "bg-muted"
              : "bg-indigo-100 shadow-sm hover:bg-blue-200 dark:bg-blue-900/70"
            : operation
              ? "border-l-error-fg"
              : "hover:bg-muted/50",
      )}
      onClick={() => {
        focusEvent(event._id);
      }}
    >
      <TableCell
        className={cn(
          "text-muted-foreground font-mono text-xs whitespace-nowrap",
          isTimeError && "text-error-fg font-semibold",
        )}
      >
        {formatTimestampEvent(event.eventTime.timestamp, tz)}
      </TableCell>

      <TableCell className="py-0">
        {info.duration != null && info.duration > 0 && (
          <Badge variant="secondary" className="text-gray-600">
            {msToHoursMinutes(info.duration)}
          </Badge>
        )}
      </TableCell>

      <TableCell className="py-0">
        <Badge className={cn(EVENT_BADGE_COLORS[code])}>
          {mainEventCodes.includes(code) && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `var(--hos-${code}-fg)` }}
            />
          )}
          {label}
        </Badge>
      </TableCell>

      <TableCell className="text-muted-foreground flex max-w-[400px] gap-4">
        <div className={cn(isLocationError && "text-error-fg")}>
          {event.location ? (
            <div className="flex min-w-0 items-center gap-4">
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

        {knownLocation && (
          <Badge variant="outline">{knownLocation.location.type}</Badge>
        )}
      </TableCell>

      <TableCell>
        {!!info.issues.length && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex items-center gap-1 font-semibold",
                  hasError ? "text-error-fg" : "text-warning-bg",
                )}
              >
                <MdError className="size-4 shrink-0" />
                {info.issues.length}
              </span>
            </TooltipTrigger>

            <TooltipContent side="top" className="bg-muted mb-2 min-w-fit">
              <div className="my-1 min-w-[250px] space-y-3">
                {Object.entries(groupedIssues).map(([group, issues]) => (
                  <div key={group}>
                    <div className="mb-1 border-b pb-1 text-xs font-semibold tracking-wide uppercase">
                      {group}
                    </div>

                    <ul className="space-y-1 text-sm">
                      {issues.map((issue, index) => (
                        <li
                          key={`${issue.code}-${issue.eventId ?? issue.logDate}-${index}`}
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

      <TableCell
        className={cn(
          "text-muted-foreground truncate text-center text-xs",
          isStatusError && "text-error-fg font-semibold",
        )}
      >
        <div className="w-full">{STATUS_MAP_SHORT[event.recordStatus?.id]}</div>
      </TableCell>

      <TableCell
        className={cn(
          "text-muted-foreground truncate text-center text-xs",
          isOriginError && "text-error-fg font-semibold",
        )}
      >
        <div className="w-full">{ORIGIN_MAP_SHORT[event.recordOrigin?.id]}</div>
      </TableCell>
      <TableCell className="tabular-nums">
        <div className="flex w-full items-center gap-2">
          <span
            className={cn(isOdometerError && "text-error-fg font-semibold")}
          >
            {event.totalVehicleMiles}
          </span>

          {info.odoDelta != null && info.odoDelta !== 0 && (
            <div
              className={cn(
                "font-semibold",
                info.odoDelta < 0 ? "text-error-fg" : "text-success-fg",
              )}
            >
              ({info.odoDelta > 0 ? "+" : ""}
              {info.odoDelta})
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="tabular-nums">
        <div className="flex w-full items-center gap-2">
          <span
            className={cn(
              engineHoursIssueSeverity === "error" &&
                "text-error-fg font-semibold",
            )}
          >
            {event.totalEngineHours}
          </span>

          {info.engHoursDelta != null && info.engHoursDelta !== 0 && (
            <div
              className={cn(
                "text-success-fg font-semibold",
                engineHoursIssueSeverity === "error" && "text-error-fg",
                engineHoursIssueSeverity === "warning" && "text-warning-bg",
              )}
            >
              ({info.engHoursDelta > 0 ? "+" : ""}
              {info.engHoursDelta.toFixed(1)})
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground p-0 text-xs">
        {event.eventComment && (
          <div className="group relative w-full min-w-0">
            <Badge
              variant="secondary"
              className="flex max-w-full min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap shadow-sm [&>svg]:size-auto [&>svg]:shrink-0"
            >
              {badgeIcons.map(({ Icon, color, size }, index) => (
                <Icon
                  key={index}
                  color={color}
                  size={(size ?? ICON_SIZES.default) - 4}
                />
              ))}

              <span className="min-w-0 flex-1 truncate">
                {event.eventComment}
              </span>
            </Badge>

            <Badge
              variant="secondary"
              className="pointer-events-none absolute top-0 left-0 z-50 hidden w-max max-w-[500px] items-center gap-1 whitespace-nowrap shadow-lg group-hover:flex [&>svg]:size-auto [&>svg]:shrink-0"
            >
              {badgeIcons.map(({ Icon, color, size }, index) => (
                <Icon
                  key={index}
                  color={color}
                  size={(size ?? ICON_SIZES.default) - 4}
                />
              ))}

              {event.eventComment}
            </Badge>
          </div>
        )}
      </TableCell>

      <TableCell className="text-xs">{event.eld?.sn.slice(-4)}</TableCell>

      <TableCell className="text-xs">{event.vehicle?.name}</TableCell>

      <TableCell className={cn("text-xs", isIDError && "text-warning")}>
        {parseInt(event.seqId, 16)}
      </TableCell>

      <TableCell>
        {operation && (
          <Badge
            className={cn(
              "capitalize",
              operation === "create" && "bg-blue-500",
              operation === "delete" && "bg-error-fg",
            )}
          >
            {operation}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
