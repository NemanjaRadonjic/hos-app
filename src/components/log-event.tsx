import { Checkbox } from "./ui/checkbox";
import { TableCell, TableRow } from "./ui/table";
import { DateTime, Duration } from "luxon";
import {
  EVENT_BADGE_COLORS,
  mainEventCodes,
  STATUS_MAP,
  TZ_MAP,
} from "@/lib/maps";
import { Badge } from "./ui/badge";
import type { HosEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { msToHoursMinutes } from "@/lib/hos/helpers";
import { getNoteIcons } from "@/lib/helpers";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { MapPin } from "lucide-react";
import { FaMapMarkedAlt } from "react-icons/fa";

interface LogEventProps {
  event: HosEvent;
  checked: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  focused: boolean;
  setFocusedId: React.Dispatch<React.SetStateAction<string | null>>;
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
  checked,
  onCheckboxClick,
  focused,
  setFocusedId,
}: LogEventProps) => {
  const tz = event.eventTime.logDate.timeZone.id;
  const code = event.eventCode.id;
  const label = code.includes("CERT")
    ? `${STATUS_MAP[code]} ${event.certifiedRecordLogDate?.date}`
    : STATUS_MAP[code];
  const variant = STATUS_MAP[code] ?? "outline";

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
      onClick={() => setFocusedId(event._id)}
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
        {event.duration && (
          <Badge variant="secondary" className="bg-transparent text-gray-600">
            {event.duration != null ? msToHoursMinutes(event.duration) : ""}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge className={EVENT_BADGE_COLORS[code]}>
          {mainEventCodes.includes(code) && (
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: `var(--hos-${code}-fg)` }}
            />
          )}
          {label}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
        <div className="flex items-center gap-4">
          {event.location?.lat && event.location?.lon && (
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                  <FaMapMarkedAlt size={20} />
                </button>
              </DialogTrigger>
              <DialogContent className="h-[60vh] w-[60vw] max-w-[100vw] p-0">
                <iframe
                  src={`https://www.google.com/maps?q=${event.location.lat},${event.location.lon}&z=18&t=k&output=embed`}
                  className="h-full w-full rounded-lg"
                />
              </DialogContent>
            </Dialog>
          )}
          {event.location?.calculatedLocation}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {event.recordOrigin?.id}
      </TableCell>
      <TableCell className="relative text-center text-sm tabular-nums">
        {event.totalVehicleMiles}

        {event.odoDelta != null && event.odoDelta > 0 && (
          <Badge className="absolute ml-2 whitespace-nowrap">
            +{event.odoDelta}
          </Badge>
        )}
      </TableCell>
      <TableCell className="relative text-center text-sm tabular-nums">
        {event.totalEngineHours}
        {event.engHoursDelta != null && event.engHoursDelta > 0 && (
          <Badge className="absolute ml-2 whitespace-nowrap">
            +{event.engHoursDelta.toFixed(1)}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">
        {event.eventComment && (
          <Badge variant="outline" className="text-sm [&>svg]:size-auto">
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

export default LogEvent;
