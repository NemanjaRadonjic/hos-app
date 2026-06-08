import { DateTime } from "luxon";
import type { HosEvent } from "@/lib/types";

const CT_ZONE = "America/Chicago";

export function getEventTime(
  eventTime: HosEvent["eventTime"],
  newTimestamp: number,
): HosEvent["eventTime"] {
  const dt = DateTime.fromMillis(newTimestamp).setZone(CT_ZONE);

  return {
    ...eventTime,
    timestamp: newTimestamp,
    logDate: {
      ...eventTime.logDate,
      date: dt.toFormat("yyyy/MM/dd"),
      timeZone: {
        ...eventTime.logDate.timeZone,
        id: "CT",
      },
    },
  };
}
