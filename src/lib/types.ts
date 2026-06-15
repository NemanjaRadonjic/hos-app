import type { Provider } from "react";

export type DriverUser = {
  _id: string;
  _rev: string;

  companyId: string;

  createdBy: string;
  createdAt: number;

  updatedBy: string;
  updatedAt: number;

  email: string;

  firstName: string;
  lastName: string;

  active: boolean;

  phoneNum: string;

  appVersion: string;

  role: {
    id: "DRIVER";
  };

  extraPermissions: unknown[];

  driverInfo: {
    companyDriverId: string;

    licenseNumber: string;

    licenseState: {
      id: string;
    };

    homeTerminal: {
      id: string;
    };

    hosSettings: HosSettings;

    avi: unknown[];
  };

  avu: number;

  ou: {
    id: string;
  };

  os: string;
  osv: string;

  type: {
    id: "User";
  };

  stime: number;

  dSTime: number;

  dId: string;
};

export interface DailyLogForm {
  trailers: string[];

  vehicles: {
    id: string;
    name: string;
    vin: string;
  }[];

  shippingDocuments: string[];

  lud: boolean;
  cl: boolean;

  company: {
    id: string;
    name: string;

    state: {
      id: string;
    };

    terminals: {
      id: string;
      logStartOffset: number;

      street: string;
      city: string;
      zipCode: string;

      timeZone: {
        id: string;
      };

      state: {
        id: string;
      };
    }[];

    timeZone: {
      id: string;
    };

    street: string;
    city: string;
    zipCode: string;
    dotNumber: string;
  };
  driver: {
    id: string;

    email: string;
    firstName: string;
    lastName: string;

    avu?: number;
    driverInfo: DriverInfo;
  };
  coDriver?: {
    id: string;

    email: string;
    firstName: string;
    lastName: string;

    avu: number;
    driverInfo: DriverInfo;
  };
  signature?: string;
}

// checked - this is a DailyLog response shape
export interface DailyLogBase {
  dSTime: number;

  logDate: {
    date: string;

    timeZone: {
      id: string;
    };

    logStartOffset: number;
  };

  form: DailyLogForm;

  type: {
    id: string;
  };
}

export interface DailyLog extends DailyLogBase {
  _id: string;
  _rev: string;

  companyId: string;
  userId: string;

  createdBy: string;
  createdAt: number;

  updatedBy: string;
  updatedAt: number;

  stime: number;
}

export interface DailyLogSummaryBase {
  _id: string;

  userId: string;

  isSigned: boolean;
  hasForms: boolean;

  timeDriven: number;
  timeOnDuty: number;

  logDate: {
    date: string;
    timeZone: {
      id: string;
    };
    logStartOffset: number;
  };

  violations: ProviderViolation[];
  availableExceptions: unknown[];
  appliedExceptions: unknown[];

  type: {
    id: string;
  };

  dSTime: number;
  dId: string;
}

export interface DailyLogSummary extends DailyLogSummaryBase {
  _rev: string;
  companyId: string;

  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;
  stime: number;
}

export interface LatestDriverStatus {
  _id: string;
  _rev: string;
  companyId: string;
  userId: string;
  createdBy: string;
  createdAt: number;
  cycleTimeAvailableTomorrow: number;
  dailyLogSummary: DailyLogSummary;
  breakTime: TimeBlock;
  driveTime: TimeBlock;
  shiftTime: TimeBlock;
  cycleTime: TimeBlock;
  hosEvent: HosEvent;
  location: Location;
  vehicle: Vehicle;
  fc?: { id: string }; // malf statuses ?
  ec: boolean;
  recap: RecapEntry[];
  type: { id: string };
  dSTime: number;
  dId: string;
  stime: number;
  updatedBy: string;
  updatedAt: number;
}

export interface TimeBlock {
  accumulatedTime: number;
  accumulatedRestartTime: number;
  limitTime: number;
  restartTime: number;
  regulation: {
    id: string;
  };
}

export interface LogDate {
  date: string;
  timeZone: {
    id: string;
  };
  logStartOffset: number;
}

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
};

type ServerFields =
  | "_rev"
  | "createdBy"
  | "createdAt"
  | "updatedBy"
  | "updatedAt"
  | "stime";

export type HosEventPayload = Omit<HosEvent, ServerFields> &
  Partial<Pick<HosEvent, ServerFields>>;

export interface Location {
  calculatedLocation: string;
  lat: number;
  lon: number;
  source: string;
  state: string;
  timestamp: number;
}

export interface Vehicle {
  id: string;
  vin: string;
}

export interface RecapEntry {
  date: LogDate;
  timeWorked: number;
}

// User
export interface User {
  _id: string;
  _rev: string;
  companyId: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;

  email: string;
  firstName: string;
  lastName: string;
  active: boolean;
  phoneNum: string;
  appVersion: string;

  role: {
    id: string; // e.g. "DRIVER", "ADMIN", etc.
  };

  extraPermissions: string[];

  driverInfo?: DriverInfo; // Optional because not all users are drivers

  avu: number;
  ou: {
    id: string;
  };
  os: string;
  osv: string;

  type: {
    id: string; // "User"
  };

  stime: number;
  dSTime: number;
  dId: string;
}

// checked - this is driverInfo shape of a Daily Log
export interface DriverInfo {
  companyDriverId: string;
  licenseNumber: string;
  licenseState: {
    id: string; // e.g. "CO"
  };
  homeTerminal: {
    id: string;
  };
  hosSettings: HosSettings;
  avi: string[]; // Array of vehicle IDs
}

// checked - this attaches to driverInfo
export interface HosSettings {
  pcAllowed: boolean;
  ymAllowed: boolean;
  is16hShortHaulExceptionAllowed: boolean;
  exempt: boolean;
  suggestedEventOriginIsDriver: boolean;
  cycle: {
    id: string; // e.g. "US_70_8"
  };
  cargoType: {
    id: string;
  };
  restartHours: {
    id: string;
  };
  restBreak: {
    id: string;
  };
  rv: number;
}

// Vehicle
export interface Vehicle {
  _id: string;
  _rev: string;
  companyId: string;
  createdBy: string;
  createdAt: number;
  updatedBy: string;
  updatedAt: number;

  name: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
  active: boolean;
  trackerId: string;

  fuel: {
    id: string; // e.g. "DIESEL"
  };

  licenseState: {
    id: string; // e.g. "IL"
  };

  eld?: {
    id: string;
    serialNumber: string;
    sn: string;
  };

  edci: {
    id: string; // e.g. "J1939"
  };

  et: {
    id: string; // e.g. "PT"
  };

  ct: string; // e.g. "Bluetooth"
  etg: string; // e.g. "E642"

  type: {
    id: string; // "Vehicle"
  };

  stime: number;
  dSTime: number;
  dId: string;
}

export interface Company {
  _id: string;
  _rev: string;

  companyId: string;

  name: string;
  dotNumber: string;

  city: string;
  street: string;
  zipCode: string;

  state: {
    id: string;
  };

  timeZone: {
    id: string;
  };

  terminals: {
    id: string;
    city: string;
    street: string;
    zipCode: string;
    logStartOffset: number;
    state: {
      id: string;
    };
    timeZone: {
      id: string;
    };
  }[];

  complianceMode: {
    id: string;
  };

  defaultHosRules: {
    pcAllowed: boolean;
    ymAllowed: boolean;
    is16hShortHaulExceptionAllowed: boolean;
    exempt: boolean;
    suggestedEventOriginIsDriver: boolean;

    cycle: {
      id: string;
    };

    cargoType: {
      id: string;
    };

    restartHours: {
      id: string;
    };

    restBreak: {
      id: string;
    };

    rv: number;
  };

  planFeatures: {
    allowGpsTracking: boolean;
    allowIFTA: boolean;
    allowTracking: boolean;
  };

  vehicleMotionThreshold: number;

  createdAt: number;
  updatedAt: number;
  stime: number;

  createdBy: string;
  updatedBy: string;

  dSTime: number;

  type: {
    id: string;
  };

  // unknown / inconsistent backend flags (keep flexible)
  a?: boolean;
  det?: { id: string };
  ehem?: boolean;
  in?: Record<string, boolean>;
  it?: boolean;
  r?: { id: string };
}
export type ProviderViolation = {
  startTime: {
    timestamp: number;
    logDate: {
      date: string;
      timeZone: {
        id: string;
      };
      logStartOffset: number;
    };
  };
  endTime: {
    timestamp: number;
    logDate: {
      date: string;
      timeZone: {
        id: string;
      };
      logStartOffset: number;
    };
  };
  regulation: {
    id: string;
  };
};
