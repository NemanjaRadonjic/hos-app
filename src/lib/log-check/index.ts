import { DateTime } from "luxon";
import type { DailyLog, HosEvent } from "@/lib/types";
import { findPreviousDutyStatusEvent } from "./helpers/find-duty-status";
import { enrichEvents } from "@/routes/drivers/helpers/enrich-events";
import { getStateSpeedLimit } from "../helpers/speed-limit";
import { getStateFromCalculatedLocation } from "../helpers/get-calculated-location";
import {
  isDrivingEvent,
  isEnginePowerEvent,
  isInterlocationEvent,
  isMovementEvent,
  isStopEvent,
} from "./helpers/status-type-checks";
import { ORIGIN_MAP, STATUS_MAP } from "../maps";

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
  | "INVALID_STATUS"
  | "LOCATION_CHANGED_WITHOUT_MOVEMENT"
  | "FUTURE_DAY_CERTIFICATION"
  | "UNJUSTIFIED_LOCATION_CHANGE"
  | "MANUAL_LOCATION"
  | "MISSING_ODOMETER"
  | "DUPLICATE_STATUS"
  | "DUPLICATE_TIMESTAMP"
  | "MISSING_ENGINE_HOURS"
  | "MISSING_LOCATION"
  | "POSSIBLE_SPEEDING"
  | "INVALID_INTERLOCATION_TIMING"
  | "MISSING_INTERLOCATION"
  | "UNCHANGED_ODOMETER_DURING_DRIVING"
  | "LOCATION_CHANGED_WITHOUT_ODOMETER_CHANGE"
  | "DUPLICATE_ENGINE_POWER_EVENT"
  | "DRIVING_WHILE_ENGINE_OFF"
  | "TELEPORT_WITH_ODOMETER_CHANGE"
  | "ENGINE_HOURS_CHANGED_WHILE_ENGINE_OFF"
  | "INVALID_ENGINE_HOURS_DELTA";

type ISSUE_GROUP =
  | "Certification"
  | "Odometer"
  | "Engine Hours"
  | "Origin"
  | "Location"
  | "Status"
  | "Time"
  | "Possible speeding"
  | "Interlocation"
  | "Event";

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
  events: HosEvent[];
  issues: LogIssue[];
  derived: {
    signature?: string;
    certificationEvents: HosEvent[];
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

export function buildLogCheck({
  events,
  dailyLogs,
  now = DateTime.now(),
}: {
  events: HosEvent[];
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

  for (const logDate of dates) {
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
          logDate: event.eventTime.logDate.date,
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
      const certEventDate = cert.eventTime.logDate.date;
      const certifiedDate = cert.certifiedRecordLogDate?.date;
      if (certifiedDate && certifiedDate > certEventDate) {
        issues.push({
          group: "Certification",
          code: "FUTURE_DAY_CERTIFICATION",
          logDate: certEventDate,
          severity: "error",
          message: "Certification event is for a future log date.",
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

  let prevEvent: HosEvent | null = null;
  let prevLocation: HosEvent["location"] | null = null;
  // this shit is used just for 1 rule, events cant have the same timestamp unless diag/malf's
  let prevTimestamp: number | null = null;
  let prevMovementEvent: HosEvent | null = null;
  let drivingAnchor: HosEvent | null = null;
  let expectedInterlocationTs: number | null = null;
  let prevEnginePowerEvent: HosEvent | undefined;
  // OTHER
  for (const { event, info } of enrichedEvents) {
    const isCert = event.eventCode.id.startsWith("DR_CERT_");
    const isAuth =
      event.eventCode.id === "DR_LOGIN" || event.eventCode.id === "DR_LOGOUT";
    const isSystem =
      event.eventCode.id.startsWith("DIAG_") ||
      event.eventCode.id.startsWith("MALF_");
    const isBasic = !isCert && !isAuth && !isSystem;
    const isStop = isStopEvent(event);
    const isMovement = isMovementEvent(event);
    const isEnginePower = isEnginePowerEvent(event);
    // ODO
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
    if (!isCert && !event.totalVehicleMiles) {
      issues.push({
        group: "Odometer",
        code: "MISSING_ODOMETER",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Missing odometer",
      });
    }
    // ODOMETER UNCHANGED DURING DRIVING
    if ((isMovement || isStop) && prevMovementEvent) {
      const durationMs =
        event.eventTime.timestamp - prevMovementEvent.eventTime.timestamp;

      const miles =
        event.totalVehicleMiles != null &&
        prevMovementEvent.totalVehicleMiles != null
          ? event.totalVehicleMiles - prevMovementEvent.totalVehicleMiles
          : null;

      if (durationMs >= 15 * 60_000 && miles === 0) {
        issues.push({
          group: "Odometer",
          code: "UNCHANGED_ODOMETER_DURING_DRIVING",
          eventId: prevMovementEvent._id,
          logDate: prevMovementEvent.eventTime.logDate.date,
          severity: "error",
          message: "Odometer did not change during driving.",
        });
      }
    }

    // NO ODO CHANGE WHILE YES LOCATION CHANGE
    if ((isMovement || isStop) && prevMovementEvent) {
      const prevLocation = prevMovementEvent.location?.calculatedLocation;
      const currentLocation = event.location?.calculatedLocation;

      const locationChanged =
        prevLocation != null &&
        currentLocation != null &&
        prevLocation !== currentLocation;

      const miles =
        event.totalVehicleMiles != null &&
        prevMovementEvent.totalVehicleMiles != null
          ? event.totalVehicleMiles - prevMovementEvent.totalVehicleMiles
          : null;

      if (locationChanged && miles === 0) {
        issues.push({
          group: "Odometer",
          code: "LOCATION_CHANGED_WITHOUT_ODOMETER_CHANGE",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: "Location changed without odometer change.",
        });
      }
    }

    // EH
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
    if (!isCert && !event.totalVehicleMiles) {
      issues.push({
        group: "Engine Hours",
        code: "MISSING_ENGINE_HOURS",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Missing engine hours.",
      });
    }

    // ENGINE HOURS VS TIME
    if (
      prevEvent &&
      !isCert &&
      event.totalEngineHours != null &&
      prevEvent.totalEngineHours != null
    ) {
      const actualDelta = event.totalEngineHours - prevEvent.totalEngineHours;

      const elapsedHours =
        (event.eventTime.timestamp - prevEvent.eventTime.timestamp) / 3_600_000;

      const engineIsDown =
        prevEnginePowerEvent?.eventCode.id === "ENG_DOWN_NORMAL";

      if (engineIsDown && actualDelta !== 0) {
        issues.push({
          group: "Engine Hours",
          code: "ENGINE_HOURS_CHANGED_WHILE_ENGINE_OFF",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "warning",
          message: `Engine hours changed by ${actualDelta.toFixed(
            1,
          )} while engine was off.`,
        });
      }

      if (!engineIsDown) {
        const diff = Math.abs(actualDelta - elapsedHours);

        if (diff > 0.05) {
          issues.push({
            group: "Engine Hours",
            code: "INVALID_ENGINE_HOURS_DELTA",
            eventId: event._id,
            logDate: event.eventTime.logDate.date,
            severity: "warning",
            message: `Engine hours changed by ${actualDelta.toFixed(
              1,
            )}, expected ${elapsedHours.toFixed(1)}.`,
          });
        }
      }
    }

    // ENG
    if (isEnginePower) {
      if (prevEnginePowerEvent?.eventCode.id === event.eventCode.id) {
        issues.push({
          group: "Engine Hours",
          code: "DUPLICATE_ENGINE_POWER_EVENT",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: "Duplicate engine power event.",
        });
      }

      prevEnginePowerEvent = event;
    }
    if (
      isDrivingEvent(event) &&
      prevEnginePowerEvent?.eventCode.id === "ENG_DOWN_NORMAL"
    ) {
      issues.push({
        group: "Engine Hours",
        code: "DRIVING_WHILE_ENGINE_OFF",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Driving while the engine is off.",
      });
    }
    // ORIGIN
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
    if (isAuth && event.recordOrigin?.id !== "ELD") {
      const status = event.eventCode.id === "DR_LOGIN" ? "Login" : "Logout";
      issues.push({
        group: "Origin",
        code: "INVALID_ORIGIN",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: `${status} has to be of origin Auto.`,
      });
    }

    if (isBasic) {
      if (!isStop) {
        if (event.recordOrigin?.id !== "ELD") {
          issues.push({
            group: "Origin",
            code: "INVALID_ORIGIN",
            eventId: event._id,
            logDate: event.eventTime.logDate.date,
            severity: "error",
            message: `'${ORIGIN_MAP[event.recordOrigin?.id]}' origin is invalid.`,
          });
        }
      } else if (event.eventCode.id !== "DS_ON") {
        if (event.recordOrigin?.id !== "DRIVER") {
          issues.push({
            group: "Origin",
            code: "INVALID_ORIGIN",
            eventId: event._id,
            logDate: event.eventTime.logDate.date,
            severity: "error",
            message: `'${ORIGIN_MAP[event.recordOrigin?.id]}' origin is invalid.`,
          });
        }
      }
    } else {
      if (
        event.recordOrigin &&
        !["ELD", "DRIVER"].includes(event.recordOrigin?.id)
      ) {
        issues.push({
          group: "Origin",
          code: "INVALID_ORIGIN",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: `'${ORIGIN_MAP[event.recordOrigin?.id]}' origin is invalid.`,
        });
      }
    }

    // STATUS
    if (isBasic) {
      if (event.recordStatus?.id !== "ACTIVE") {
        issues.push({
          group: "Status",
          code: "INVALID_STATUS",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: `'${STATUS_MAP[event.recordStatus?.id]}' status is invalid.`,
        });
      }
    }

    // LOCATION
    const currentLocation = event.location?.calculatedLocation;
    if (currentLocation && prevEvent) {
      const locationChanged =
        currentLocation !== prevLocation?.calculatedLocation;
      const justified = isMovementEvent(prevEvent) && (isMovement || isStop);

      if (locationChanged && !justified) {
        issues.push({
          group: "Location",
          code: "UNJUSTIFIED_LOCATION_CHANGE",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: "Unjustified location change.",
        });
      }
    }
    if (!isCert && !isAuth) {
      if (!event.location && !event.driverLocationDescription) {
        issues.push({
          group: "Location",
          code: "MISSING_LOCATION",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: "Missing location",
        });
      }
    }
    if (event.driverLocationDescription) {
      issues.push({
        group: "Location",
        code: "MANUAL_LOCATION",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Manual location",
      });
    }

    // TELEPORT
    const prevCalculatedLocation = prevLocation?.calculatedLocation;

    const locationChanged =
      currentLocation != null &&
      prevCalculatedLocation != null &&
      currentLocation !== prevCalculatedLocation;

    const odoChanged = info.odoDelta != null && info.odoDelta > 0;

    const previousAllowedMovement =
      prevEvent != null && isMovementEvent(prevEvent);

    if (locationChanged && odoChanged && !previousAllowedMovement) {
      issues.push({
        group: "Location",
        code: "TELEPORT_WITH_ODOMETER_CHANGE",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: `Location changed while not driving. Odometer increased by ${info.odoDelta} mi.`,
      });
    }

    // DUPLICATE STATUSES
    const isInterlocation = isInterlocationEvent(event);
    if (!isInterlocation && prevEvent?.eventCode.id === event.eventCode.id) {
      issues.push({
        group: "Event",
        code: "DUPLICATE_STATUS",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Duplicate status",
      });
    }

    // SAME TIMESTAMP
    const prevSecond = prevTimestamp && Math.floor(prevTimestamp / 1000);
    const currentSecond = Math.floor(event.eventTime.timestamp / 1000);

    if (!isSystem && prevSecond === currentSecond) {
      issues.push({
        group: "Time",
        code: "DUPLICATE_TIMESTAMP",
        eventId: event._id,
        logDate: event.eventTime.logDate.date,
        severity: "error",
        message: "Events occur within the same second",
      });
    }

    const isDriving = isDrivingEvent(event);
    if (isDriving) {
      drivingAnchor = event;
      expectedInterlocationTs = event.eventTime.timestamp + 3_600_000;
    }
    // INTERLOCATION TIMING
    if (isInterlocation) {
      if (!drivingAnchor || expectedInterlocationTs == null) {
        issues.push({
          group: "Time",
          code: "INVALID_INTERLOCATION_TIMING",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: "Interlocation exists outside of driving.",
        });
      } else if (event.eventTime.timestamp !== expectedInterlocationTs) {
        issues.push({
          group: "Time",
          code: "INVALID_INTERLOCATION_TIMING",
          eventId: event._id,
          logDate: event.eventTime.logDate.date,
          severity: "error",
          message: "Interlocation timing is off.",
        });
      }

      expectedInterlocationTs = event.eventTime.timestamp + 3_600_000;
    }

    // MISSING INTERLOCATION
    if (isStop && drivingAnchor && expectedInterlocationTs != null) {
      if (expectedInterlocationTs < event.eventTime.timestamp) {
        issues.push({
          group: "Time",
          code: "MISSING_INTERLOCATION",
          eventId: drivingAnchor._id,
          logDate: drivingAnchor.eventTime.logDate.date,
          severity: "error",
          message: "Missing interlocation",
        });

        expectedInterlocationTs += 3_600_000;
      }

      drivingAnchor = null;
      expectedInterlocationTs = null;
    }
    // POSSIBLE SPEEDING
    if ((isMovement || isStop) && prevMovementEvent) {
      const durationHours =
        (event.eventTime.timestamp - prevMovementEvent.eventTime.timestamp) /
        3_600_000;

      const miles =
        event.totalVehicleMiles != null &&
        prevMovementEvent.totalVehicleMiles != null
          ? event.totalVehicleMiles - prevMovementEvent.totalVehicleMiles
          : null;

      const fromState = getStateFromCalculatedLocation(
        prevMovementEvent.location?.calculatedLocation,
      );

      const toState = getStateFromCalculatedLocation(
        event.location?.calculatedLocation,
      );

      const fromLimit = fromState ? getStateSpeedLimit(fromState) : null;
      const toLimit = toState ? getStateSpeedLimit(toState) : null;

      const speedLimit =
        fromLimit != null && toLimit != null
          ? Math.floor((fromLimit + toLimit) / 2)
          : (fromLimit ?? toLimit);

      if (
        durationHours > 0 &&
        miles != null &&
        miles > 0 &&
        speedLimit != null
      ) {
        const mph = Math.round(miles / durationHours);

        if (mph > speedLimit) {
          issues.push({
            group: "Possible speeding",
            code: "POSSIBLE_SPEEDING",
            eventId: prevMovementEvent._id,
            logDate: prevMovementEvent.eventTime.logDate.date,
            severity: "warning",
            message: `Average speed is ${mph} mph. Expected threshold is ${speedLimit} mph.`,
          });
        }
      }
    }

    if (isMovement) {
      prevMovementEvent = event;
    }

    if (isStop) {
      prevMovementEvent = null;
      drivingAnchor = null;
      expectedInterlocationTs = null;
    }

    if (!isCert) {
      prevEvent = event;
    }

    if (!isCert && !isAuth) {
      prevLocation = event.location;
    }
    if (!isSystem) {
      prevTimestamp = event.eventTime.timestamp;
    }
  }

  return { byDate, issues };
}
