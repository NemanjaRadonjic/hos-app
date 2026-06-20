import type { LogIssue } from "@/lib/log-check";
import type { HosEvent, HosEventPayload } from "@/lib/types";

export type EnrichedEvent = {
  event: HosEvent | HosEventPayload;
  info: {
    odoDelta: number | null;
    engHoursDelta: number | null;
    issues: LogIssue[];
  };
};

export function enrichEvents(
  events: HosEventPayload[],
  issues: LogIssue[] = [],
): EnrichedEvent[] {
  const issuesByEventId = new Map<string, LogIssue[]>();

  for (const issue of issues) {
    if (!issue.eventId) continue;

    const list = issuesByEventId.get(issue.eventId) ?? [];
    list.push(issue);
    issuesByEventId.set(issue.eventId, list);
  }

  let lastNonCertEvent: HosEventPayload | null = null;

  return events.map((event) => {
    const isCert = event.eventCode.id.startsWith("DR_CERT_");

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

    return {
      event,
      info: {
        odoDelta,
        engHoursDelta,
        issues: issuesByEventId.get(event._id) ?? [],
        hasError:
          issuesByEventId
            .get(event._id)
            ?.some((issue) => issue.severity === "error") ?? false,
      },
    };
  });
}
