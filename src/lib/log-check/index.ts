import { DateTime } from "luxon";
import type { DailyLog, HosEventPayload } from "@/lib/types";
import { findPreviousDutyStatusEvent } from "./helpers/find-duty-status";
import { enrichEvents } from "@/routes/drivers/helpers/enrich-events";

export type LogIssueCode =
  | "MISSING_SIGNATURE"
  | "MISSING_CERTIFICATION"
  | "DUPLICATE_CERTIFICATION"
  | "CURRENT_DAY_CERTIFICATION"
  | "CURRENT_DAY_SIGNATURE"
  | "INVALID_CERTIFICATION_TIME"
  | "CERTIFICATION_DURING_DRIVING"
  | "NEGATIVE_ODOMETER_DELTA"
  | "NEGATIVE_ENGINE_HOURS_DELTA"
  | "INVALID_ORIGIN"
  | "LOCATION_CHANGED_WITHOUT_MOVEMENT";

type ISSUE_GROUP =
  | "Certification"
  | "Odometer"
  | "Engine Hours"
  | "Origin"
  | "Location";

export type LogIssue = {
  eventId?: string;
  code: LogIssueCode;
  group: ISSUE_GROUP;
  logDate: string;
  severity: "error" | "warning";
  message: string;
};

export type LogDayCheck = {
  logDate: string;
  dailyLog?: DailyLog;
  events: HosEventPayload[];
  issues: LogIssue[];
  derived: {
    signature?: string;
    certificationEvents: HosEventPayload[];
    isCertified: boolean;
    hasSignature: boolean;
    canCertify: boolean;
    isCurrentDay: boolean;
  };
};

export type LogDiagnosticsState = {
  byDate: Record<string, LogDayCheck>;
  issues: LogIssue[];
};

const activeStatusCodes = ["DS_ON", "DS_D"];

export function buildLogCheck({
  events,
  dailyLogs,
  now = DateTime.now(),
}: {
  events: HosEventPayload[];
  dailyLogs: DailyLog[];
  now?: DateTime;
}): LogDiagnosticsState {
  const byDate: Record<string, LogDayCheck> = {};
  const issues: LogIssue[] = [];
  const dates = new Set<string>();
  const enrichedEvents = enrichEvents(events);
  for (const log of dailyLogs) {
    dates.add(log.logDate.date);
  }

  for (const event of events) {
    dates.add(event.eventTime.logDate.date);
  }

  const lastActiveStatusEvent = [...events]
    .filter((event) => activeStatusCodes.includes(event.eventCode.id))
    .sort((a, b) => b.eventTime.timestamp - a.eventTime.timestamp)[0];

  const lastActiveLogDate = lastActiveStatusEvent?.eventTime.logDate.date;

  const activeCutoffDate = lastActiveLogDate
    ? DateTime.fromFormat(lastActiveLogDate, "yyyy/MM/dd")
        .minus({ days: 7 })
        .toFormat("yyyy/MM/dd")
    : undefined;

  for (const logDate of dates) {
    const isAfterLastActiveDay =
      lastActiveLogDate && logDate > lastActiveLogDate;
    const day = DateTime.fromFormat(logDate, "yyyy/MM/dd");

    const dailyLog = dailyLogs.find((log) => log.logDate.date === logDate);

    const dayEvents = events.filter(
      (event) => event.eventTime.logDate.date === logDate,
    );

    const certificationEvents = events.filter(
      (event) =>
        event.eventCode.id === "DR_CERT_1" &&
        event.certifiedRecordLogDate?.date === logDate,
    );

    const isCurrentDay = day.hasSame(now, "day");
    const hasSignature = Boolean(dailyLog?.form.signature);

    // const certRequired =
    //   !isCurrentDay &&
    //   lastActiveLogDate !== undefined &&
    //   logDate <= lastActiveLogDate &&
    //   (!activeCutoffDate || logDate >= activeCutoffDate);

    const certRequired = !isCurrentDay;

    if (isCurrentDay && hasSignature) {
      issues.push({
        group: "Certification",
        code: "CURRENT_DAY_SIGNATURE",
        logDate,
        severity: "error",
        message: "Current day should not be signed yet.",
      });
    }

    if (!hasSignature) {
      if (certificationEvents.length > 0) {
        issues.push({
          group: "Certification",
          code: "MISSING_SIGNATURE",
          logDate,
          severity: "error",
          message: "Certified log is missing signature.",
        });
      } else if (certRequired) {
        issues.push({
          group: "Certification",
          code: "MISSING_SIGNATURE",
          logDate,
          severity: "error",
          message: "Log is missing signature.",
        });
      }
    }

    if (certRequired && certificationEvents.length === 0) {
      issues.push({
        group: "Certification",
        code: "MISSING_CERTIFICATION",
        logDate,
        severity: "error",
        message: "Log is missing certification.",
      });
    }

    if (certificationEvents.length > 1) {
      for (const event of certificationEvents.slice(1)) {
        issues.push({
          group: "Certification",
          code: "DUPLICATE_CERTIFICATION",
          logDate,
          severity: "error",
          message: "Log has duplicate certification events.",
          eventId: event._id,
        });
      }
    }

    const lastMainEvent = dayEvents
      .filter((event) => event.eventCode.id === "DS_D")
      .sort((a, b) => b.eventTime.timestamp - a.eventTime.timestamp)[0];
    for (const cert of certificationEvents) {
      const previousStatus = findPreviousDutyStatusEvent(
        events,
        cert.eventTime.timestamp,
      );

      if (previousStatus?.eventCode.id === "DS_D") {
        issues.push({
          group: "Certification",
          code: "CERTIFICATION_DURING_DRIVING",
          logDate,
          severity: "error",
          message: "Certification event occurs while driver is still driving.",
          eventId: cert._id,
        });
      }

      if (isCurrentDay) {
        issues.push({
          group: "Certification",
          code: "CURRENT_DAY_CERTIFICATION",
          logDate,
          severity: "error",
          message: "Current day should not be certified yet.",
          eventId: cert._id,
        });

        continue;
      }

      if (
        lastMainEvent &&
        cert.eventTime.timestamp <= lastMainEvent.eventTime.timestamp
      ) {
        issues.push({
          group: "Certification",
          code: "INVALID_CERTIFICATION_TIME",
          logDate,
          severity: "error",
          message: "Activity after the certification event.",
          eventId: cert._id,
        });
      }
    }

    byDate[logDate] = {
      logDate,
      dailyLog,
      events: dayEvents,
      issues: issues.filter((issue) => issue.logDate === logDate),
      derived: {
        signature: dailyLog?.form.signature,
        certificationEvents,
        isCertified: certificationEvents.length > 0,
        hasSignature,
        canCertify: !isCurrentDay && certificationEvents.length === 0,
        isCurrentDay,
      },
    };
  }
  let previousCalculatedLocation: string | null = null;
  // OTHER
  for (const { event, info } of enrichedEvents) {
    if (event.location) {
      previousCalculatedLocation = event.location.calculatedLocation;
    }
    // NEGATIVE ODO
    if (info.odoDelta != null && info.odoDelta < 0) {
      issues.push({
        group: "Odometer",
        code: "NEGATIVE_ODOMETER_DELTA",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Odometer decreased from previous event.",
      });
    }

    // NEGATIVE EH
    if (
      event.eventCode.id !== "DR_CERT_1" &&
      info.engHoursDelta != null &&
      info.engHoursDelta < 0
    ) {
      issues.push({
        group: "Engine Hours",
        code: "NEGATIVE_ENGINE_HOURS_DELTA",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Engine hours decreased from previous event.",
      });
    }

    // ORIGIN
    if (event.eventCode.id === "DS_D" && event.recordOrigin?.id === "DRIVER") {
      issues.push({
        group: "Origin",
        code: "INVALID_ORIGIN",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Driving status has a driver origin.",
      });
    }
    if (
      event.recordOrigin &&
      !["ELD", "AUTO", "DRIVER"].includes(event.recordOrigin?.id)
    ) {
      issues.push({
        group: "Origin",
        code: "INVALID_ORIGIN",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Invalid origin.",
      });
    }
    if (event.recordOrigin?.id === "ELD" && event.eventComment) {
      issues.push({
        group: "Origin",
        code: "INVALID_ORIGIN",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "A note is making this origin invalid.",
      });
    }

    // LOCATION
    const currentLocation = event.location?.calculatedLocation;
    if (
      currentLocation &&
      !isMovementStatus(event.eventCode.id) &&
      previousCalculatedLocation !== currentLocation
    ) {
      issues.push({
        group: "Location",
        code: "LOCATION_CHANGED_WITHOUT_MOVEMENT",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "warning",
        message: "Location changed without driving.",
      });
    }
  }

  return { byDate, issues };
}

const isMovementStatus = (code: string) =>
  code === "DS_D" ||
  code.startsWith("LOG_NORMAL_") ||
  code.startsWith("LOG_REDUCED_");
