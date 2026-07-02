// BASE VERSION SHOULD BUILD A NEW EVENT BASED ON PREV EVENT

import { getEventFamily } from "@/components/LogEvent/EditForm/helpers/get-event-family";
import type { HosEventLocal } from "../types";

type BuildEventProps = {
  ref: HosEventLocal;
  update: Partial<HosEventLocal>;
};

export function stripEmpty<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  ) as Partial<T>;
}

export const buildEvent = ({ ref, update }: BuildEventProps) => {
  const refFamily = getEventFamily(ref.eventCode.id);
  if (update.eventCode?.id) {
    const updateFamily = getEventFamily(update.eventCode?.id);
    if (refFamily !== updateFamily) {
      switch (updateFamily) {
        case "BASIC": {
          const newEvent = {
            _id: update._id ?? ref._id,
            companyId: update.companyId ?? ref.companyId,
            userId: update.userId ?? ref.userId,

            // rev intentionally omitted

            createdBy: update.createdBy ?? ref.createdBy,
            createdAt: update.createdAt ?? ref.createdAt,
            updatedBy: update.updatedBy ?? ref.updatedBy,
            updatedAt: update.updatedAt ?? ref.updatedAt,

            seqId: update.seqId ?? ref.seqId,

            totalVehicleMiles:
              update.totalVehicleMiles ?? ref.totalVehicleMiles,
            totalEngineHours: update.totalEngineHours ?? ref.totalEngineHours,
            accumulatedVehicleMiles:
              update.accumulatedVehicleMiles ?? ref.accumulatedVehicleMiles,
            elapsedEngineHours:
              update.elapsedEngineHours ?? ref.elapsedEngineHours,
            distSinceLastValidCoords:
              update.distSinceLastValidCoords ?? ref.distSinceLastValidCoords,

            isLive: update.isLive ?? ref.isLive,

            recordStatus: update.recordStatus ?? ref.recordStatus,
            recordOrigin: update.recordOrigin ?? ref.recordOrigin,

            eventCode: update.eventCode ?? ref.eventCode,
            eventTime: update.eventTime ?? ref.eventTime,

            vehicle: update.vehicle ?? ref.vehicle,
            location: update.location ?? ref.location,
            eld: update.eld ?? ref.eld,

            suggestedEditEventIds:
              update.suggestedEditEventIds ?? ref.suggestedEditEventIds,

            eventComment: update.eventComment ?? ref.eventComment,

            av: update.av ?? ref.av,
            pd: update.pd ?? ref.pd,
            at: update.at ?? ref.at,

            type: update.type ?? ref.type,
            dSTime: update.dSTime ?? ref.dSTime,
            dId: update.dId ?? ref.dId,
            stime: update.stime ?? ref.stime,
          };
          return stripEmpty(newEvent);
        }
      }
    } else {
      const newEvent = { ...ref, ...update };
      return stripEmpty(newEvent);
    }
  }
};

export type HosEvent = {
  _id: string;
  _rev: string;
  companyId: string;
  userId: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  seqId: string;
  totalVehicleMiles?: number;
  totalEngineHours?: number;
  isLive: boolean;
  recordStatus?: { id: string };
  recordOrigin?: { id: string };
  eventCode: { id: string };
  eventTime: {
    timestamp: number;
    logDate: {
      date: string;
      timeZone: { id: string };
      logStartOffset: number;
    };
  };
  vehicle: {
    id: string;
    name: string;
    vin: string;
  };
  location?: {
    calculatedLocation: string;
    lat: number;
    lon: number;
    source: string;
    state: string;
    timestamp: number;
  };
  eld?: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  suggestedEditEventIds: string[];
  av?: string;
  pd: boolean;
  at: boolean;
  type: { id: "HosEvent" };
  dSTime: number;
  dId: string;
  stime: number;
  eventComment?: string;
  certifiedRecordLogDate?: {
    date: string;
    timeZone: {
      id: string;
    };
    logStartOffset: number;
  };
  driverLocationDescription?: string;

  // diags
  fc?: { id: string };
  dg?: { cm: string };

  // optional i guess, props that appear on some statuses
  malfuncIndicatorStatus?: boolean;
  diagnosticIndicatorStatus?: boolean;
  accumulatedVehicleMiles?: number;
  elapsedEngineHours?: number;
  distSinceLastValidCoords?: number;

  // inspection
  i?: boolean;
};
