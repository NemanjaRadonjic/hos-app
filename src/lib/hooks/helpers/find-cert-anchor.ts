import type { HosEventPayload } from "@/lib/types";
import type { DateTime } from "luxon";

const statusTypes = ["DS_OFF", "DS_SB", "DS_ON"];

export const findCertAnchorEvent = ({
  events,
  selectedDay,
}: {
  events: HosEventPayload[];
  selectedDay: DateTime;
}) => {
  const dayStart = selectedDay.startOf("day").toMillis();
  const dayEnd = selectedDay.endOf("day").toMillis();

  const futureStatus = events.find(
    (e) =>
      e.eventTime.timestamp > dayEnd && statusTypes.includes(e.eventCode.id),
  );

  if (futureStatus) return futureStatus;

  const lastStatusToday = [...events]
    .reverse()
    .find(
      (e) =>
        e.eventTime.timestamp >= dayStart &&
        e.eventTime.timestamp <= dayEnd &&
        statusTypes.includes(e.eventCode.id),
    );

  return lastStatusToday;
};
