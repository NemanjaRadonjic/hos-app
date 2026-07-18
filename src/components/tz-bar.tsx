import { TZ_MAP } from "@/lib/maps";
import { DateTime } from "luxon";
import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";

const TIMEZONES = Object.entries(TZ_MAP).map(([label, tz]) => ({
  label,
  tz,
}));

export const TimezoneBar = () => {
  const [times, setTimes] = useState<Record<string, DateTime>>({});

  useEffect(() => {
    const tick = () => {
      setTimes(
        Object.fromEntries(
          TIMEZONES.map(({ label, tz }) => [label, DateTime.now().setZone(tz)]),
        ),
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-center gap-4">
      {TIMEZONES.map(({ label, tz }) => {
        const dt = times[label];
        return (
          <div
            key={tz}
            className="border-muted-foreground flex flex-row items-center gap-2 rounded-md border px-4 py-0 shadow-sm"
          >
            <span className="text-muted-foreground text-xs font-medium tracking-wide">
              {label}
            </span>
            <span className="font-medium tabular-nums">
              {dt?.toFormat("h:mm a") ?? "--:-- --"}
            </span>
            <span className="text-muted-foreground text-xs">
              {dt?.toFormat("EEE, MMM d") ?? "--"}
            </span>
          </div>
        );
      })}
    </div>
  );
};
