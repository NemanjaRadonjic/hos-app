import type { HosEvent, HosEventPayload } from "../types";

export const sortEvents = (events: HosEventPayload[]) =>
  [...events].sort((a, b) => a.eventTime.timestamp - b.eventTime.timestamp);
