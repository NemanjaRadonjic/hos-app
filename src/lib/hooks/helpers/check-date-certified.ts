import type { HosEventPayload } from "@/lib/types";

export const isDayCertified = (events: HosEventPayload[], logDate: string) => {
  return events.some(
    (event) =>
      event.eventCode.id === "DR_CERT_1" &&
      event.certifiedRecordLogDate?.date === logDate,
  );
};
