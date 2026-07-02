// type DutyStatusKey = "DS_OFF" | "DS_ON" | "DS_D" | "DS_SB";

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export const STATUS_MAP = {
  DS_OFF: "Off Duty", // DONE
  DS_WT: "Off Duty (Waiting Time)",
  DS_ON: "On Duty", // DONE
  DS_D: "Driving", // DONE
  DS_SB: "Sleeper", // DONE
  DR_LOGIN: "Login", // DONE
  DR_LOGOUT: "Logout", // DONE
  MALF_LOGGED: "Engine synchronization compliance malfunction", // DONE
  MALF_CLEARED: "Engine synchronization compliance", // DONE
  DIAG_LOGGED: "Unidentified driving records data diagnostic", // DONE
  DIAG_CLEARED: "Power data diagnostic (cleared)", // DONE
  LOG_NORMAL_PRECISION: "Intermediate w/ CLP", // DONE
  LOG_REDUCED_PRECISION: "Intermediate w/ RLP",
  ENG_UP_NORMAL: "Engine Power-up w/ CLP", // DONE
  ENG_UP_REDUCED: "Engine Power-up w/ RLP",
  ENG_DOWN_NORMAL: "Engine Shut-down w/ CLP", // DONE
  ENG_DOWN_REDUCED: "Engine Shut-down w/ RLP",
  DR_IND_PC: "Personal Use", // DONE
  DR_IND_YM: "Yard Moves",
  DR_CERT_1: "Certification (1)", // DONE
  DR_CERT_2: "Certification (2)",
  DR_CERT_3: "Certification (3)",
  DR_CERT_4: "Certification (4)",
  DR_CERT_5: "Certification (5)",
  DR_CERT_6: "Certification (6)",
  DR_CERT_7: "Certification (7)",
  DR_CERT_8: "Certification (8)",
  DR_CERT_9: "Certification (>=9)",
} as const;

export type EventCode = keyof typeof STATUS_MAP;

export const ORIGIN_MAP = {
  DRIVER: "Driver",
  ELD: "Auto",
  OTHER_USER: "Other user",
  WITHOUT_ORIGIN: "Without origin",
  UNIDENTIFIED_DRIVER: "Unidentified Driver",
};

export const TZ_MAP: Record<string, string> = {
  PT: "America/Los_Angeles",
  MT: "America/Denver",
  CT: "America/Chicago",
  ET: "America/New_York",
};

export const ICON_SIZES = {
  default: 20,
  fuel: 14,
};

export const NOTES_MAP = {
  fuel: ["fuel"],
  del: ["del", "reciever", "drop"],
  pu: ["pu", "pick", "hook"],
};

export const mainEventCodes = ["DS_OFF", "DS_SB", "DS_D", "DS_ON"];

export const EVENT_BADGE_COLORS: Record<string, string> = {
  DS_OFF: "bg-[var(--hos-DS_OFF-bg)] text-[var(--hos-DS_OFF-fg)]",
  DS_ON: "bg-[var(--hos-DS_ON-bg)] text-[var(--hos-DS_ON-fg)]",
  DS_D: "bg-[var(--hos-DS_D-bg)] text-[var(--hos-DS_D-fg)]",
  DS_SB: "bg-[var(--hos-DS_SB-bg)] text-[var(--hos-DS_SB-fg)]",

  DS_WT: "bg-[var(--hos-DS_WT-bg)] text-[var(--hos-DS_WT-fg)]",

  DR_IND_PC: "bg-[var(--hos-DR_IND_PC-bg)] text-[var(--hos-DR_IND_PC-fg)]",

  DR_IND_YM: "bg-[var(--hos-DR_IND_YM-bg)] text-[var(--hos-DR_IND_YM-fg)]",

  DR_LOGIN: "bg-[var(--hos-DR_LOGIN-bg)] text-[var(--hos-DR_LOGIN-fg)]",

  DR_LOGOUT: "bg-[var(--hos-DR_LOGOUT-bg)] text-[var(--hos-DR_LOGOUT-fg)]",

  MALF_LOGGED:
    "bg-[var(--hos-MALF_LOGGED-bg)] text-[var(--hos-MALF_LOGGED-fg)]",

  MALF_CLEARED:
    "bg-[var(--hos-MALF_CLEARED-bg)] text-[var(--hos-MALF_CLEARED-fg)]",

  DIAG_LOGGED:
    "bg-[var(--hos-DIAG_LOGGED-bg)] text-[var(--hos-DIAG_LOGGED-fg)]",

  DIAG_CLEARED:
    "bg-[var(--hos-DIAG_CLEARED-bg)] text-[var(--hos-DIAG_CLEARED-fg)]",

  LOG_NORMAL_PRECISION:
    "bg-[var(--hos-LOG_NORMAL_PRECISION-bg)] text-[var(--hos-LOG_NORMAL_PRECISION-fg)]",

  LOG_REDUCED_PRECISION:
    "bg-[var(--hos-LOG_REDUCED_PRECISION-bg)] text-[var(--hos-LOG_REDUCED_PRECISION-fg)]",

  ENG_UP_NORMAL:
    "bg-[var(--hos-ENG_UP_NORMAL-bg)] text-[var(--hos-ENG_UP_NORMAL-fg)]",

  ENG_UP_REDUCED:
    "bg-[var(--hos-ENG_UP_REDUCED-bg)] text-[var(--hos-ENG_UP_REDUCED-fg)]",

  ENG_DOWN_NORMAL:
    "bg-[var(--hos-ENG_DOWN_NORMAL-bg)] text-[var(--hos-ENG_DOWN_NORMAL-fg)]",

  ENG_DOWN_REDUCED:
    "bg-[var(--hos-ENG_DOWN_REDUCED-bg)] text-[var(--hos-ENG_DOWN_REDUCED-fg)]",

  DR_CERT_1: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_2: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_3: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_4: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_5: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_6: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_7: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_8: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
  DR_CERT_9: "bg-[var(--hos-DR_CERT-bg)] text-[var(--hos-DR_CERT-fg)]",
};

export const STATE_SPEED_LIMITS = {
  AL: 70,
  AZ: 70,
  AR: 70,
  CA: 55,
  CO: 70,
  CT: 65,
  DE: 65,
  FL: 70,
  GA: 70,
  ID: 70,
  IL: 60,
  IN: 65,
  IA: 65,
  KS: 70,
  KY: 70,
  LA: 70,
  ME: 70,
  MD: 65,
  MA: 65,
  MI: 60,
  MN: 70,
  MS: 70,
  MO: 70,
  MT: 65,
  NE: 70,
  NV: 70,
  NH: 65,
  NJ: 65,
  NM: 70,
  NY: 65,
  NC: 70,
  ND: 70,
  OH: 65,
  OK: 70,
  OR: 55,
  PA: 65,
  RI: 65,
  SC: 70,
  SD: 70,
  TN: 70,
  TX: 72,
  UT: 70,
  VT: 65,
  VA: 65,
  WA: 60,
  WV: 65,
  WI: 65,
  WY: 70,
} as const;
