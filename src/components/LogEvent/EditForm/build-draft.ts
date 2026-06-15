import type { HosEvent } from "@/lib/types";
import type { Draft, EventFamily } from "../helpers/types";
import { getEventFamily } from "./helpers/get-event-family";
import { DateTime } from "luxon";

export const buildDraft = (event: HosEvent, eventCode: string): Draft => {
  const family = getEventFamily(eventCode);
  const defaultCertifiedRecordLogDate = {
    date: DateTime.fromFormat(event.eventTime.logDate.date, "yyyy/MM/dd")
      .minus({ days: 1 })
      .toFormat("yyyy/MM/dd"),
    timeZone: {
      id: "CT",
    },
    logStartOffset: 0,
  };

  const positioning =
    !event.location && !event.driverLocationDescription
      ? "WITHOUT_LOCATION"
      : event.driverLocationDescription
        ? "MANUAL"
        : "AUTO";

  const hasLocation = family !== "CERT" && family !== "AUTH";
  const hasELD = family !== "CERT";
  const hasOrigin = family !== "CERT";
  const hasStatus = family !== "CERT";
  const hasNote = family !== "CERT" && family !== "DIAG";
  return {
    family,
    event: {
      seqId: String(parseInt(event.seqId, 16)),
      eventTime: event.eventTime,
      eventCode,
      certifiedRecordLogDate:
        event.certifiedRecordLogDate ?? defaultCertifiedRecordLogDate,
      vehicle: event.vehicle,
      eld: hasELD ? event.eld : undefined,
      status: hasStatus ? event.recordStatus?.id : undefined,
      origin: hasOrigin ? event.recordOrigin?.id : undefined,
      odometer: event.totalVehicleMiles,
      engineHours: event.totalEngineHours,
      locationSource: event.isLive,
      location: hasLocation ? event.location : undefined,
      driverLocationDescription: event.driverLocationDescription,
      positioning: hasLocation ? positioning : "WITHOUT_LOCATION",
      note: hasNote ? event.eventComment : undefined,
    },
  };
};
