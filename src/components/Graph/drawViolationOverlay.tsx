import type { Violation } from "@/lib/hos/calculations-old";
import type { GraphSizes } from "./types";
import { DateTime } from "luxon";

type DrawViolationOverlayProps = {
  ctx: CanvasRenderingContext2D;
  violation: Violation | null;
  dayStart: number;
  dayEnd: number;
  GRAPH_SIZES: GraphSizes;
};

export default function drawViolationOverlay({
  ctx,
  violation,
  dayStart,
  dayEnd,
  GRAPH_SIZES,
}: DrawViolationOverlayProps) {
  if (!violation) return;

  const vStart = violation.startTs;
  const vEnd = violation.endTs ?? Date.now();

  const start = Math.max(vStart, dayStart);
  const end = Math.min(vEnd, dayEnd);

  if (end <= start) return;

  const startMinutes = (start - dayStart) / 60000;
  const endMinutes = (end - dayStart) / 60000;

  const x1 =
    GRAPH_SIZES.paddingLeft + (startMinutes / 1440) * GRAPH_SIZES.graphWidth;

  const x2 =
    GRAPH_SIZES.paddingLeft + (endMinutes / 1440) * GRAPH_SIZES.graphWidth;
  // console.log({
  //   dayStart: DateTime.fromMillis(dayStart, {
  //     zone: "America/Chicago",
  //   }).toFormat("MMM d h:mm a"),
  //   dayEnd: DateTime.fromMillis(dayEnd, { zone: "America/Chicago" }).toFormat(
  //     "MMM d h:mm a",
  //   ),
  //   vStart: DateTime.fromMillis(vStart, { zone: "America/Chicago" }).toFormat(
  //     "MMM d h:mm a",
  //   ),
  //   vEnd: DateTime.fromMillis(vEnd, { zone: "America/Chicago" }).toFormat(
  //     "MMM d h:mm a",
  //   ),
  //   start: DateTime.fromMillis(start, { zone: "America/Chicago" }).toFormat(
  //     "MMM d h:mm a",
  //   ),
  //   end: DateTime.fromMillis(end, { zone: "America/Chicago" }).toFormat(
  //     "MMM d h:mm a",
  //   ),
  // });
  ctx.fillStyle = "rgba(239,68,68,0.18)";
  ctx.fillRect(x1, GRAPH_SIZES.paddingTop, x2 - x1, GRAPH_SIZES.graphHeight);

  ctx.strokeStyle = "rgba(239,68,68,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x1, GRAPH_SIZES.paddingTop, x2 - x1, GRAPH_SIZES.graphHeight);
}
