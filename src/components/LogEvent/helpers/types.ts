import type { EventCode } from "@/lib/maps";
import type { HosEvent, HosEventPayload } from "@/lib/types";

export type EventFamily = "BASIC" | "CERT" | "AUTH" | "DIAG";

export type DraftEvent = {
  seqId: string;
  eventTime: HosEvent["eventTime"];
  eventCode: string;
  certifiedRecordLogDate?: {
    date: string;
    timeZone: { id: string };
    logStartOffset: number;
  };
  vehicle: HosEvent["vehicle"];
  eld?: HosEvent["eld"];
  status?: string;
  origin?: string;
  odometer?: number;
  engineHours?: number;
  locationSource: boolean;
  location?: HosEvent["location"];
  positioning: string;
  driverLocationDescription?: string;
  note?: string;
};

export type DraftEventErrors = Partial<Record<keyof DraftEvent, string>>;

export type Draft = {
  family: EventFamily;
  event: DraftEvent;
};

export type ClientHosEventBase = {
  _id: string;
  companyId: string;
  userId: string;
  seqId: string;
  isLive: boolean;
  eventCode: { id: string };
  eventTime: HosEvent["eventTime"];
  vehicle: HosEvent["vehicle"];
  suggestedEditEventIds: string[];
  type: { id: "HosEvent" };
  dSTime: number;
  dId: string;
  pd: boolean;
  at: boolean;
  av?: string;
};

export type CertHosEvent = ClientHosEventBase & {
  certifiedRecordLogDate: {
    date: string;
    timeZone: { id: string };
    logStartOffset: number;
  };
};

// export type BasicHosEvent = ClientHosEventBase & {
//   recordOrigin?: { id: string };
//   recordStatus?: { id: string };
//   location?: {
//     calculatedLocation: string;
//     lat: number;
//     lon: number;
//     source: string;
//     state: string;
//     timestamp: number;
//   };
//   eld?: {
//     id: string;
//     serialNumber: string;
//     sn: string;
//   };
//   totalVehicleMiles?: number;
//   totalEngineHours?: number;
// };

export type BasicHosEventStrict = ClientHosEventBase & {
  recordOrigin: { id: string };
  recordStatus: { id: string };
  location: {
    calculatedLocation: string;
    lat: number;
    lon: number;
    source: string;
    state: string;
    timestamp: number;
  };
  eld: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  totalVehicleMiles: number;
  totalEngineHours: number;
};

export type AuthHosEvent = ClientHosEventBase & {
  recordOrigin?: { id: string };
  eld?: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  totalVehicleMiles: number;
  totalEngineHours: number;
};

export type AuthHosEventStrict = ClientHosEventBase & {
  recordOrigin: { id: string };
  eld: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  totalVehicleMiles: number;
  totalEngineHours: number;
};

export type DiagHosEvent = ClientHosEventBase & {
  recordOrigin?: { id: string };
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
  totalVehicleMiles?: number;
  totalEngineHours?: number;

  fc?: {
    id: string;
  };
  dg?: {
    cm: string;
  };
};

export type DiagHosEventStrict = ClientHosEventBase & {
  recordOrigin: { id: string };
  location: {
    calculatedLocation: string;
    lat: number;
    lon: number;
    source: string;
    state: string;
    timestamp: number;
  };
  eld: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  totalVehicleMiles: number;
  totalEngineHours: number;

  fc: {
    id: string;
  };
  dg: {
    cm: string;
  };
};

export type AppHosEvent =
  | BasicHosEventStrict
  | CertHosEvent
  | AuthHosEvent
  | DiagHosEvent;
