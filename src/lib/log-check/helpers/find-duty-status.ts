import { mainEventCodes } from "@/lib/maps";
import type { HosEvent } from "@/lib/types";

export function findPreviousDutyStatusEvent(
  events: HosEvent[],
  ts: number,
): HosEvent | undefined {
  return [...events]
    .reverse()
    .find(
      (event) =>
        mainEventCodes.includes(event.eventCode.id) &&
        event.eventTime.timestamp < ts,
    );
}

export function findNextDutyStatusEvent(
  events: HosEvent[],
  ts: number,
): HosEvent | undefined {
  return events.find(
    (event) =>
      mainEventCodes.includes(event.eventCode.id) &&
      event.eventTime.timestamp > ts,
  );
}
