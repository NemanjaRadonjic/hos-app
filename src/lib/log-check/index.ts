import { DateTime } from "luxon";
import type { DailyLog, HosEventPayload } from "@/lib/types";
import { findPreviousDutyStatusEvent } from "./helpers/find-duty-status";

export type LogIssueCode =
  | "MISSING_SIGNATURE"
  | "MISSING_CERTIFICATION"
  | "DUPLICATE_CERTIFICATION"
  | "CURRENT_DAY_CERTIFICATION"
  | "CURRENT_DAY_SIGNATURE"
  | "INVALID_CERTIFICATION_TIME"
  | "CERTIFICATION_DURING_DRIVING";

export type LogIssue = {
  eventId?: string;
  code: LogIssueCode;
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

const certAfterEventCodes = ["DS_OFF", "DS_SB", "DS_D", "DS_ON"];
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

  for (const log of dailyLogs) {
    console.log(log, { date: log.logDate.date });
    dates.add(log.logDate.date);
  }

  for (const event of events) {
    dates.add(event.eventTime.logDate.date);
  }

  const lastActiveStatusEvent = [...events]
    .filter((event) => activeStatusCodes.includes(event.eventCode.id))
    .sort((a, b) => b.eventTime.timestamp - a.eventTime.timestamp)[0];

  const lastActiveLogDate = lastActiveStatusEvent?.eventTime.logDate.date;

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

    const dayIssues: LogIssue[] = [];

    if (isCurrentDay && hasSignature) {
      dayIssues.push({
        code: "CURRENT_DAY_SIGNATURE",
        logDate,
        severity: "error",
        message: "Current day should not be signed yet.",
      });
    }

    if (!isCurrentDay && !isAfterLastActiveDay && !hasSignature) {
      dayIssues.push({
        code: "MISSING_SIGNATURE",
        logDate,
        severity: "error",
        message: "Log is missing signature.",
      });
    }

    if (
      !isCurrentDay &&
      !isAfterLastActiveDay &&
      certificationEvents.length === 0
    ) {
      dayIssues.push({
        code: "MISSING_CERTIFICATION",
        logDate,
        severity: "error",
        message: "Log is missing certification.",
      });
    }

    if (certificationEvents.length > 0 && !hasSignature) {
      dayIssues.push({
        code: "MISSING_SIGNATURE",
        logDate,
        severity: "error",
        message: "Certified log is missing signature.",
      });
    }

    if (certificationEvents.length > 1) {
      for (const event of certificationEvents.slice(1)) {
        dayIssues.push({
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
        dayIssues.push({
          code: "CERTIFICATION_DURING_DRIVING",
          logDate,
          severity: "error",
          message: "Certification event occurs while driver is still driving.",
          eventId: cert._id,
        });
      }

      if (isCurrentDay) {
        dayIssues.push({
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
        dayIssues.push({
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
      issues: dayIssues,
      derived: {
        signature: dailyLog?.form.signature,
        certificationEvents,
        isCertified: certificationEvents.length > 0,
        hasSignature,
        canCertify: !isCurrentDay && certificationEvents.length === 0,
        isCurrentDay,
      },
    };

    issues.push(...dayIssues);
  }

  return { byDate, issues };
}
