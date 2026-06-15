import { DateTime } from "luxon";
import type {
  AppHosEvent,
  AuthHosEvent,
  BasicHosEvent,
  CertHosEvent,
  DiagHosEvent,
} from "../helpers/types";
import type { HosEvent } from "@/lib/types";

export function buildBasicEventType(
  prev: HosEvent,
  status: string,
): BasicHosEvent {
  return {
    _id: prev._id,
    companyId: prev.companyId,
    userId: prev.userId,

    // createdBy: prev.createdBy,
    // createdAt: prev.createdAt,
    // updatedBy: prev.updatedBy,
    // updatedAt: prev.updatedAt,

    seqId: prev.seqId,

    isLive: true,

    type: { id: "HosEvent" },

    eventCode: { id: status },

    eventTime: {
      timestamp: prev.eventTime.timestamp,
      logDate: { ...prev.eventTime.logDate },
    },

    vehicle: { ...prev.vehicle },

    eld: prev.eld ? { ...prev.eld } : undefined,

    recordStatus: prev.recordStatus ?? { id: "ACTIVE" },
    recordOrigin: prev.recordOrigin ?? { id: "DRIVER" },

    suggestedEditEventIds: prev.suggestedEditEventIds ?? [],

    dId: prev.dId,
    av: prev.av,
    at: prev.at,
    pd: prev.pd,
    dSTime: -1, // ?

    totalVehicleMiles: prev.totalVehicleMiles ?? 0,
    totalEngineHours: prev.totalEngineHours ?? 0,

    // optional props that exist on some statuses
    ...(prev.accumulatedVehicleMiles !== undefined && {
      accumulatedVehicleMiles: prev.accumulatedVehicleMiles,
    }),
    ...(prev.elapsedEngineHours !== undefined && {
      elapsedEngineHours: prev.elapsedEngineHours,
    }),
    ...(prev.distSinceLastValidCoords !== undefined && {
      distSinceLastValidCoords: prev.distSinceLastValidCoords,
    }),
    ...(prev.diagnosticIndicatorStatus !== undefined && {
      diagnosticIndicatorStatus: prev.diagnosticIndicatorStatus,
    }),
    ...(prev.malfuncIndicatorStatus !== undefined && {
      malfuncIndicatorStatus: prev.malfuncIndicatorStatus,
    }),

    location: prev.location ? { ...prev.location } : undefined,
  };
}

export function buildCertEventType(
  prev: HosEvent,
  status: string,
): CertHosEvent {
  const certDate = DateTime.fromFormat(
    prev.eventTime.logDate.date,
    "yyyy/MM/dd",
  )
    .minus({ days: 1 })
    .toFormat("yyyy/MM/dd");
  return {
    _id: prev._id,
    companyId: prev.companyId,
    userId: prev.userId,

    // createdBy: prev.createdBy,
    // createdAt: prev.createdAt,
    // updatedBy: prev.updatedBy,
    // updatedAt: prev.updatedAt,

    seqId: prev.seqId,

    isLive: true,

    type: { id: "HosEvent" },

    eventCode: { id: status },

    eventTime: {
      timestamp: prev.eventTime.timestamp,
      logDate: { ...prev.eventTime.logDate },
    },

    vehicle: { ...prev.vehicle },

    suggestedEditEventIds: prev.suggestedEditEventIds ?? [],

    // optional props that exist on some statuses
    ...(prev.accumulatedVehicleMiles !== undefined && {
      accumulatedVehicleMiles: prev.accumulatedVehicleMiles,
    }),
    ...(prev.elapsedEngineHours !== undefined && {
      elapsedEngineHours: prev.elapsedEngineHours,
    }),
    ...(prev.distSinceLastValidCoords !== undefined && {
      distSinceLastValidCoords: prev.distSinceLastValidCoords,
    }),
    ...(prev.diagnosticIndicatorStatus !== undefined && {
      diagnosticIndicatorStatus: prev.diagnosticIndicatorStatus,
    }),
    ...(prev.malfuncIndicatorStatus !== undefined && {
      malfuncIndicatorStatus: prev.malfuncIndicatorStatus,
    }),

    // stime: Date.now(),
    dSTime: -1,
    dId: prev.dId,

    certifiedRecordLogDate: {
      date: certDate,
      timeZone: { id: "CT" },
      logStartOffset: 0,
    },

    ...(prev.av !== undefined && { av: prev.av }),
    pd: false,
    at: true,
  };
}

export function buildAuthEventType(
  prev: HosEvent,
  status: string,
): AuthHosEvent {
  return {
    _id: prev._id,
    companyId: prev.companyId,
    userId: prev.userId,

    // createdBy: prev.createdBy,
    // createdAt: prev.createdAt,

    seqId: prev.seqId,

    isLive: true,

    type: { id: "HosEvent" },

    eventCode: { id: status },

    eventTime: {
      timestamp: prev.eventTime.timestamp,
      logDate: { ...prev.eventTime.logDate },
    },

    vehicle: { ...prev.vehicle },

    totalVehicleMiles: prev.totalVehicleMiles ?? 0,
    totalEngineHours: prev.totalEngineHours ?? 0,

    suggestedEditEventIds: prev.suggestedEditEventIds ?? [],

    eld: prev.eld ? { ...prev.eld } : undefined,

    // optional props that exist on some statuses
    ...(prev.accumulatedVehicleMiles !== undefined && {
      accumulatedVehicleMiles: prev.accumulatedVehicleMiles,
    }),
    ...(prev.elapsedEngineHours !== undefined && {
      elapsedEngineHours: prev.elapsedEngineHours,
    }),
    ...(prev.distSinceLastValidCoords !== undefined && {
      distSinceLastValidCoords: prev.distSinceLastValidCoords,
    }),
    ...(prev.diagnosticIndicatorStatus !== undefined && {
      diagnosticIndicatorStatus: prev.diagnosticIndicatorStatus,
    }),
    ...(prev.malfuncIndicatorStatus !== undefined && {
      malfuncIndicatorStatus: prev.malfuncIndicatorStatus,
    }),

    // stime: Date.now(),
    dSTime: -1,
    dId: prev.dId,

    recordOrigin: { id: "ELD" },
    ...(prev.av !== undefined && { av: prev.av }),
    pd: false,
    at: true,
  };
}

export function buildDiagEventType(
  prev: HosEvent,
  status: string,
): DiagHosEvent {
  return {
    _id: prev._id,
    companyId: prev.companyId,
    userId: prev.userId,

    // createdBy: prev.createdBy,
    // createdAt: prev.createdAt,
    // updatedBy: prev.updatedBy,
    // updatedAt: prev.updatedAt,

    seqId: prev.seqId,

    isLive: true,

    type: { id: "HosEvent" },

    eventCode: { id: status },

    eventTime: {
      timestamp: prev.eventTime.timestamp,
      logDate: { ...prev.eventTime.logDate },
    },

    vehicle: { ...prev.vehicle },

    eld: prev.eld ? { ...prev.eld } : undefined,

    recordOrigin: {
      id: "ELD",
    },

    suggestedEditEventIds: prev.suggestedEditEventIds ?? [],

    // stime: Date.now(),
    dSTime: -1,
    dId: prev.dId,

    fc: prev.fc ? { ...prev.fc } : { id: "D_POWER" },

    dg: prev.dg ? { ...prev.dg } : { cm: "pw:eeo" },

    totalVehicleMiles: prev.totalVehicleMiles ?? 0,
    totalEngineHours: prev.totalEngineHours ?? 0,

    // optional props that exist on some statuses
    ...(prev.accumulatedVehicleMiles !== undefined && {
      accumulatedVehicleMiles: prev.accumulatedVehicleMiles,
    }),
    ...(prev.elapsedEngineHours !== undefined && {
      elapsedEngineHours: prev.elapsedEngineHours,
    }),
    ...(prev.distSinceLastValidCoords !== undefined && {
      distSinceLastValidCoords: prev.distSinceLastValidCoords,
    }),
    ...(prev.diagnosticIndicatorStatus !== undefined && {
      diagnosticIndicatorStatus: prev.diagnosticIndicatorStatus,
    }),
    ...(prev.malfuncIndicatorStatus !== undefined && {
      malfuncIndicatorStatus: prev.malfuncIndicatorStatus,
    }),

    pd: false,
    at: true,

    location: prev.location ? { ...prev.location } : undefined,
  };
}
