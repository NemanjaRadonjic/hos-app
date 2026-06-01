import { DateTime } from "luxon";
import { getTokenPayload } from "../helpers";
import { mainEventCodes } from "../maps";
import type { Company, DailyLog, DriverInfo, HosEvent, User } from "../types";
import type { Segment } from "./segments";
import { customAlphabet } from "nanoid";
import { useQueryClient } from "@tanstack/react-query";
import type { DriverSimplified } from "../hooks/useDriversData";

export function isRest(seg: Segment) {
  return seg.status === "DS_OFF" || seg.status === "DS_SB";
}

export function isDriving(seg: Segment) {
  return seg.status === "DS_D";
}

export function isOnDuty(seg: Segment) {
  return seg.status === "DS_D" || seg.status === "DS_ON";
}

export function msToHoursMinutes(ms: number): string {
  const totalMinutes = Math.floor(ms / 1000 / 60);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

export function isActiveEvent(event: HosEvent) {
  return event.recordStatus.id === "ACTIVE";
}

export function isDutyEvent(event: HosEvent) {
  return mainEventCodes.includes(event.eventCode.id);
}

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";

export const generateHosEventId = () => {
  const len = Math.floor(Math.random() * 3) + 10;
  const nanoid = customAlphabet(alphabet, len);
  return `HosEvent:${nanoid()}`;
};

type BuildDailyLogProps = {
  dailyLogId: string;
  driver: DriverSimplified;
  selectedDay: DateTime<true>;
  company: Company;
};

export const buildDailyLog = ({
  dailyLogId,
  driver,
  selectedDay,
  company,
}: BuildDailyLogProps) => {
  const { id, cid } = getTokenPayload().user;

  const dailyLogBody = {
    // dSTime: -1,
    form: {
      cl: false,
      lud: true,
      trailers: [],
      shippingDocuments: [],
      vehicles: [],
      company: {
        city: company.city,
        dotNumber: company.dotNumber,
        id: company._id,
        name: company.name,
        state: company.state,
        street: company.street,
        terminals: company.terminals,
        timeZone: company.timeZone,
        zipCode: company.zipCode,
      },
      driver: driver.dataAsDriver,
    },
    logDate: {
      date: selectedDay.toFormat("yyyy/MM/dd"),
      logStartOffset: 0,
      timeZone: {
        id: "CT",
      },
    },
    type: { id: "DailyLog" },
    userId: driver.id,
    _id: dailyLogId,
  };
  return dailyLogBody;
};

export const buildDailyLogSummary = (
  id: string,
  // companyId,
  // createdBy,
  userId: string,
  date: string,
  hasForms = true,
  isSigned = false,
) => {
  return {
    appliedExceptions: [],
    availableExceptions: [],
    // companyId,
    // createdAt: now,
    // dId: crypto.randomUUID(),
    // dSTime: -1,
    hasForms,
    isSigned,
    logDate: {
      date,
      timeZone: {
        id: "CT",
      },
      logStartOffset: 0,
    },
    // timeDriven: 0,
    // timeOnDuty: 0,
    type: {
      id: "DailyLogSummary",
    },
    userId,
    violations: [],
    _id: id,
  };
};

export const buildHosEvent = () => {
  return {
    _id: "",
    _rev: "",

    recordStatus: {
      id: "ACTIVE",
    },

    recordOrigin: {
      id: "DRIVER",
    },

    eventCode: {
      id: "",
    },

    location: {
      lat: 0,
      lon: 0,
      calculatedLocation: "",
      source: "",
      state: "",
      timestamp: 0,
    },

    malfuncIndicatorStatus: false,
    diagnosticIndicatorStatus: false,

    suggestedEditEventIds: [],

    type: {
      id: "HosEvent",
    },

    isLive: true,

    dSTime: -1,

    createdBy: "",
    userId: "",
    companyId: "",

    eventTime: {
      logDate: {
        logStartOffset: 0,
        date: "",
        timeZone: {
          id: "CT",
        },
      },
      timestamp: 0,
    },

    dId: "",

    totalVehicleMiles: 0,
    totalEngineHours: 0,

    seqId: "",

    eld: {
      id: "",
      serialNumber: "",
      sn: "",
    },

    vehicle: {
      id: "",
      name: "",
      vin: "",
    },

    createdAt: 0,
    stime: 0,
  };
};
