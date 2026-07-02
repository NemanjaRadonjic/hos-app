import type { HosEvent } from "@/lib/types";

export const isInterlocationEvent = (event: HosEvent) =>
  ["LOG_REDUCED_PRECISION", "LOG_NORMAL_PRECISION"].includes(
    event.eventCode.id,
  );

export const isStopEvent = (event: HosEvent) =>
  ["DS_ON", "DS_OFF", "DS_SB"].includes(event.eventCode.id);

export const isDrivingEvent = (event: HosEvent) =>
  event.eventCode.id === "DS_D";

export const isMovementEvent = (event: HosEvent) =>
  isInterlocationEvent(event) || isDrivingEvent(event);

export const isEnginePowerEvent = (event: HosEvent) =>
  [
    "ENG_UP_NORMAL",
    "ENG_DOWN_NORMAL",
    "ENG_UP_REDUCED",
    "ENG_DOWN_REDUCED",
  ].includes(event.eventCode.id);
