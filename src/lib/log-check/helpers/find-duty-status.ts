import type { HosEventPayload } from "@/lib/types";

const dutyStatusCodes = ["DS_OFF", "DS_SB", "DS_D", "DS_ON"];

export function findPreviousDutyStatusEvent(
  events: HosEventPayload[],
  ts: number,
): HosEventPayload | undefined {
  return events
    .filter(
      (event) =>
        dutyStatusCodes.includes(event.eventCode.id) &&
        event.eventTime.timestamp < ts,
    )
    .sort((a, b) => b.eventTime.timestamp - a.eventTime.timestamp)[0];
}
