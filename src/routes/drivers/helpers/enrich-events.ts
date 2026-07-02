import { DateTime } from "luxon";
import { mainEventCodes } from "@/lib/maps";
import type { LogIssue } from "@/lib/log-check";
import type { HosEvent } from "@/lib/types";

const CT_ZONE = "America/Chicago";

export type EnrichedEvent = {
  event: HosEvent;
  info: {
    duration: number | null;
    odoDelta: number | null;
    engHoursDelta: number | null;
    issues: LogIssue[];
    hasError: boolean;
  };
};

export function enrichEvents(
  events: HosEvent[],
  issues: LogIssue[] = [],
): EnrichedEvent[] {
  const issuesByEventId = new Map<string, LogIssue[]>();

  for (const issue of issues) {
    if (!issue.eventId) continue;

    const list = issuesByEventId.get(issue.eventId) ?? [];
    list.push(issue);
    issuesByEventId.set(issue.eventId, list);
  }

  let lastNonCertEvent: HosEvent | null = null;

  return events.map((event, index) => {
    const isCert = event.eventCode.id.startsWith("DR_CERT_");
    const isMainStatus = mainEventCodes.includes(event.eventCode.id);

    const nextMainStatus = events
      .slice(index + 1)
      .find((next) => mainEventCodes.includes(next.eventCode.id));

    const duration = isMainStatus
      ? (nextMainStatus?.eventTime.timestamp ??
          DateTime.now().setZone(CT_ZONE).toMillis()) -
        event.eventTime.timestamp
      : null;

    const odoDelta =
      !isCert &&
      event.totalVehicleMiles != null &&
      lastNonCertEvent?.totalVehicleMiles != null
        ? event.totalVehicleMiles - lastNonCertEvent.totalVehicleMiles
        : null;

    const engHoursDelta =
      !isCert &&
      event.totalEngineHours != null &&
      lastNonCertEvent?.totalEngineHours != null
        ? event.totalEngineHours - lastNonCertEvent.totalEngineHours
        : null;

    if (!isCert) {
      lastNonCertEvent = event;
    }

    const eventIssues = issuesByEventId.get(event._id) ?? [];

    return {
      event,
      info: {
        duration,
        odoDelta,
        engHoursDelta,
        issues: eventIssues,
        hasError: eventIssues.some((issue) => issue.severity === "error"),
      },
    };
  });
}
