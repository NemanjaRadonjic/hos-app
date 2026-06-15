import type { Draft } from "../helpers/types";

export type ValidationErrors = Partial<Record<string, string>>;

export function validateDraft(draft: Draft): ValidationErrors {
  const errors: ValidationErrors = {};
  const { family } = draft;
  const {
    seqId,
    eventTime,
    eventCode,
    certifiedRecordLogDate,
    vehicle,
    eld,
    status,
    origin,
    odometer,
    engineHours,
    locationSource,
    location,
    driverLocationDescription,
    positioning,
    note,
  } = draft.event;

  // seqId
  if (!seqId) {
    errors.seqId = "Event ID is required";
  }

  // vehicle
  if (!vehicle?.id) {
    errors.vehicle = "Vehicle is required";
  }

  // ELD
  if (family !== "CERT" && !eld) {
    errors.eld = "ELD is required";
  }

  // ODO
  if (family !== "CERT" && odometer == null) {
    errors.odometer = "Odometer is required";
  }
  // EH
  if (family !== "CERT" && engineHours == null) {
    errors.engineHours = "Engine hours are required";
  }

  // event time
  if (eventTime.timestamp > Date.now()) {
    errors.eventTime = "Event time cannot be in the future";
  }

  if (family === "CERT") {
    if (certifiedRecordLogDate!.date >= eventTime.logDate.date) {
      errors.certifiedRecordLogDate = "You can only certify past days";
    }
  }
  // status none only allowed on auth/cert
  if (family === "BASIC") {
    if (!status || status === "NONE") {
      errors.status = "Invalid status";
    }
  }

  if (status === "INACTIVE_CHANGED") {
    errors.status = "Invalid status";
  }

  // ORIGIN
  if (eventCode === "DS_D" && origin === "DRIVER") {
    errors.origin = "Invalid origin";
  }
  if (note && origin !== "DRIVER") {
    errors.origin = "A note is making this origin invalid";
  }
  if (family !== "CERT" && !["ELD", "DRIVER"].includes(origin || "")) {
    errors.origin = "Invalid origin";
  }

  // LOCATION SOURCE
  if (locationSource && positioning === "MANUAL") {
    errors.locationSource = "Positioning is manual";
  }
  if (!locationSource && positioning === "AUTO") {
    errors.locationSource = "Positioning is automatic";
  }

  if (positioning === "MANUAL" && !driverLocationDescription?.length) {
    errors.driverLocationDescription = "Manual location is required";
  }

  // LOCATION
  if ((positioning === "AUTO" && !location?.lat) || !location?.lon) {
    errors.eventTime;
  }

  return errors;
}
