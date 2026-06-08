import type { HosEvent } from "../types";

export const sortEvents = (events: HosEvent[]) =>
  [...events].sort((a, b) => a.eventTime.timestamp - b.eventTime.timestamp);
