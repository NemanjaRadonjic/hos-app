import type { GRAPH_STATUS_COLORS } from "./constants";
import type { HosEvent } from "@/lib/types";
import type { DateTime } from "luxon";

export type GraphSizes = {
  canvasWidth: number;
  canvasHeight: number;
  graphWidth: number;
  graphHeight: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
  lineWidth: number;
  fontSize: number;
};
type DutyStatus = keyof typeof GRAPH_STATUS_COLORS;

export type DutyEvent = {
  startTime: number;
  endTime: number;
  status: DutyStatus;
  miles: number | null;
  nextMiles: number | null;
};

export type RowPositions = Record<string, number>;

export type DrawLineGraphProps = {
  ctx: CanvasRenderingContext2D;
  mainEvents: HosEvent[];
  dutyEvents: DutyEvent[];
  rowPositions: RowPositions;
  isSelectedDayToday: boolean;
  selectedDay: DateTime;
  sizes: GraphSizes;
};

export type EventCode = keyof typeof GRAPH_STATUS_COLORS;
