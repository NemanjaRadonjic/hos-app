import type { HosEventPayload } from "@/lib/types";
import type { DateTime } from "luxon";

const restStatusTypes = ["DS_OFF", "DS_SB", "DS_ON"];

export const findCertAnchorEvent = ({
  events,
  selectedDay,
}: {
  events: HosEventPayload[];
  selectedDay: DateTime;
}) => {
  const dayStart = selectedDay.startOf("day").toMillis();
  const dayEnd = selectedDay.endOf("day").toMillis();

  const sortedEvents = [...events].sort(
    (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
  );

  const futureEvents = sortedEvents.filter(
    (e) => e.eventTime.timestamp > dayEnd,
  );

  const futureRest = futureEvents.find((e) =>
    restStatusTypes.includes(e.eventCode.id),
  );

  if (futureRest) return futureRest;

  // Future events exist, but none are rest statuses.
  if (futureEvents.length > 0) {
    return undefined;
  }

  const todayEvents = sortedEvents.filter(
    (e) => e.eventTime.timestamp >= dayStart && e.eventTime.timestamp <= dayEnd,
  );

  const lastStatusToday = todayEvents.at(-1);

  if (
    !lastStatusToday ||
    !restStatusTypes.includes(lastStatusToday.eventCode.id)
  ) {
    return undefined;
  }

  // Walk backward to the first event in the final consecutive rest block.
  let anchor = lastStatusToday;

  for (let i = todayEvents.length - 2; i >= 0; i--) {
    const event = todayEvents[i];

    if (!restStatusTypes.includes(event.eventCode.id)) {
      break;
    }

    anchor = event;
  }

  return anchor;
};
