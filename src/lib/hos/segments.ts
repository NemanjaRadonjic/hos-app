import { DateTime } from "luxon";
import { mainEventCodes } from "../maps";
import type { HosEvent } from "../types";
import { isActiveEvent, isDutyEvent } from "./helpers";

export type DutyStatus = "DS_OFF" | "DS_SB" | "DS_D" | "DS_ON";

export interface Segment {
  status: DutyStatus;
  startTs: number;
  endTs: number;
  durationMs: number;
}

export function buildSegments(events: HosEvent[]): Segment[] {
  const dutyEvents = events
    .filter((e) => isDutyEvent(e) && isActiveEvent(e))
    .sort((a, b) => a.eventTime.timestamp - b.eventTime.timestamp);

  return dutyEvents.map((event, i) => {
    const next = dutyEvents[i + 1];

    const startTs = event.eventTime.timestamp;

    // last segment extends to now
    const endTs = next ? next.eventTime.timestamp : DateTime.now().toMillis();

    return {
      status: event.eventCode.id as DutyStatus,
      startTs,
      endTs,
      durationMs: endTs - startTs,
    };
  });
}
