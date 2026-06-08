import { DateTime } from "luxon";

export function buildBasicEventType(prev: any, status: string) {
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

    eld: prev.eld ? { ...prev.eld } : null,

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
    ...(prev.accumulatedVehicleMiles !== undefined && {
      accumulatedVehicleMiles: prev.accumulatedVehicleMiles,
    }),
    ...(prev.elapsedEngineHours !== undefined && {
      elapsedEngineHours: prev.elapsedEngineHours,
    }),
    ...(prev.distSinceLastValidCoords !== undefined && {
      distSinceLastValidCoords: prev.distSinceLastValidCoords,
    }),

    location: prev.location ? { ...prev.location } : null,
  };
}

export function buildCertEventType(prev: any, status: string) {
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

    // what ?
    accumulatedVehicleMiles: 0,
    elapsedEngineHours: 0,
    distSinceLastValidCoords: 0,
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

export function buildAuthEventType(prev: any, status: string) {
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

    // stime: Date.now(),
    dSTime: -1,
    dId: prev.dId,

    recordOrigin: { id: "ELD" },
    ...(prev.av !== undefined && { av: prev.av }),
    pd: false,
    at: true,
  };
}

export function buildDiagEventType(prev: any, status: string) {
  return {
    companyId: prev.companyId,
    userId: prev.userId,

    createdBy: prev.createdBy,
    createdAt: prev.createdAt,
    updatedBy: prev.updatedBy,
    updatedAt: prev.updatedAt,

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

    suggestedEditEventIds: prev.suggestedEditEventIds ?? [],

    stime: Date.now(),
    dId: prev.dId,

    fc: prev.fc ? { ...prev.fc } : undefined,

    dg: prev.dg ? { ...prev.dg } : undefined,

    malfuncIndicatorStatus: prev.malfuncIndicatorStatus ?? false,
    diagnosticIndicatorStatus: prev.diagnosticIndicatorStatus ?? false,

    location: prev.location ? { ...prev.location } : undefined,
  };
}
