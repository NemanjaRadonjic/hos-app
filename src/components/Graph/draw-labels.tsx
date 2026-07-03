import { msToHHMMSS } from "@/lib/helpers";
import type { EventCode, GraphSizes, RowPositions } from "./types";
import { GRAPH_STATUS_COLORS, GRAPH_STATUS_LABELS } from "./constants";
import type { HosEvent } from "@/lib/types";
import type { DateTime } from "luxon";
import { buildSegments } from "@/lib/hos/segments";

type DrawLabelsProps = {
  ctx: CanvasRenderingContext2D;
  events: HosEvent[];
  selectedDay: DateTime<true> | DateTime<false>;
  ROW_POSITIONS: RowPositions;
  GRAPH_SIZES: GraphSizes;
};

export default function drawLabels({
  ctx,
  ROW_POSITIONS,
  events,
  selectedDay,
  GRAPH_SIZES,
}: DrawLabelsProps) {
  const { paddingLeft, paddingBottom, canvasHeight, graphWidth, fontSize } =
    GRAPH_SIZES;

  // LEFT LABELS
  ctx.textAlign = "right";
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  Object.entries(ROW_POSITIONS).forEach(([status, y]) => {
    ctx.fillStyle = GRAPH_STATUS_COLORS[status as EventCode];
    ctx.fillText(
      GRAPH_STATUS_LABELS[status as EventCode],
      paddingLeft - 10,
      y + fontSize * 0.4,
    );
  });
  const startOfDayTs = selectedDay.startOf("day").toMillis();
  const endOfDayTs = selectedDay.plus({ days: 1 }).startOf("day").toMillis();

  const segments = buildSegments(events)
    .map((seg) => {
      const startTs = Math.max(seg.startTs, startOfDayTs);
      const endTs = Math.min(seg.endTs, endOfDayTs);

      return {
        ...seg,
        startTs,
        endTs,
        durationMs: Math.max(0, endTs - startTs),
      };
    })
    .filter((seg) => seg.durationMs > 0);

  const totals = segments.reduce(
    (acc, seg) => {
      acc[GRAPH_STATUS_LABELS[seg.status]] += seg.durationMs;

      return acc;
    },
    { OFF: 0, SB: 0, D: 0, ON: 0 },
  );

  // RIGHT LABELS
  ctx.textAlign = "left";
  ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
  Object.entries(ROW_POSITIONS).forEach(([status, y]) => {
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue(`--hos-${status}-bg`)
      .trim();
    ctx.fillText(
      msToHHMMSS(totals[GRAPH_STATUS_LABELS[status as EventCode]]),
      paddingLeft + graphWidth + 10,
      y + fontSize * 0.4,
    );
  });
  ctx.fillStyle = "#000";
  ctx.fillText(
    msToHHMMSS(totals.ON + totals.D),
    paddingLeft + graphWidth + 10,
    canvasHeight - paddingBottom * 0.3,
  );
}
