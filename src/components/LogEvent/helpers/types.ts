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
  _rev: string;
  companyId: string;
  userId: string;

  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;

  seqId: string;
  isLive: boolean;
  eventCode: { id: string };
  eventTime: HosEvent["eventTime"];
  vehicle: HosEvent["vehicle"];

  suggestedEditEventIds: string[];

  av?: string;
  pd: boolean;
  at: boolean;

  type: HosEvent["type"];
  dSTime: number;
  dId: string;
  stime: number;
};

export type CertHosEvent = ClientHosEventBase & {
  certifiedRecordLogDate: {
    date: string;
    timeZone: { id: string };
    logStartOffset: number;
  };
};

export type BasicHosEvent = ClientHosEventBase & {
  recordOrigin?: { id: string };
  recordStatus?: { id: string };
  location?: HosEvent["location"];
  eld?: {
    id: string;
    serialNumber: string;
    sn: string;
  };
  totalVehicleMiles?: number;
  totalEngineHours?: number;
  eventComment?: string;
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
