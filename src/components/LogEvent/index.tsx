import { Checkbox } from "../ui/checkbox";
import { TableCell, TableRow } from "../ui/table";
import { DateTime, Duration } from "luxon";
import {
  EVENT_BADGE_COLORS,
  mainEventCodes,
  ORIGIN_MAP,
  STATUS_MAP,
  TZ_MAP,
} from "@/lib/maps";
import { Badge } from "../ui/badge";
import type { HosEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { getNoteIcons } from "@/lib/helpers";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { MapPin } from "lucide-react";
import { FaMapMarkedAlt } from "react-icons/fa";
import EventCode from "./event-code";
import { memo } from "react";
import type { EventInfo } from "@/routes/drivers/$driverId";

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
  const tz = event.eventTime.logDate.timeZone.id;

  const icons = getNoteIcons(event.eventComment);

  return (
    <TableRow
      key={event._id}
      id={`row-${event._id}`}
      style={{
        transitionDelay: focused ? "80ms" : "0ms",
      }}
      className={cn(
        "transition-all duration-200",
        focused
          ? "bg-indigo-100 shadow-sm hover:bg-blue-200 dark:bg-blue-900/70"
          : "hover:bg-muted/50",
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
      <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
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
              {event.location?.calculatedLocation}
            </div>
          ) : (
            event.driverLocationDescription
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {event.recordStatus?.id}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {ORIGIN_MAP[event.recordOrigin?.id]}
      </TableCell>
      <TableCell className="relative text-center text-sm tabular-nums">
        {event.totalVehicleMiles}

        {eventInfo.odoDelta != null && eventInfo.odoDelta > 0 && (
          <Badge className="absolute ml-2 whitespace-nowrap">
            +{eventInfo.odoDelta}
          </Badge>
        )}
      </TableCell>
      <TableCell className="relative text-center text-sm tabular-nums">
        {event.totalEngineHours}
        {eventInfo.engHoursDelta != null && eventInfo.engHoursDelta > 0 && (
          <Badge className="absolute ml-2 whitespace-nowrap">
            +{eventInfo.engHoursDelta.toFixed(1)}
          </Badge>
        )}
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
      <TableCell className="text-sm">{event.vehicle?.name}</TableCell>
      <TableCell className="text-sm">{parseInt(event.seqId, 16)}</TableCell>
    </TableRow>
  );
};

export default memo(LogEvent);
