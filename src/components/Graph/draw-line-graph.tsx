import { DateTime } from "luxon";
import { minutesToHours } from "@/lib/helpers";
import type { HosEvent } from "@/lib/types";
import type { DutyEvent, EventCode, GraphSizes, RowPositions } from "./types";
import { GRAPH_STATUS_COLORS } from "./constants";
import { getStateSpeedLimit } from "@/lib/helpers/speed-limit";
import { getStateFromCalculatedLocation } from "@/lib/helpers/get-calculated-location";

type DrawLineGraphProps = {
  ctx: CanvasRenderingContext2D;
  mainEvents: HosEvent[];
  interlocationEvents: HosEvent[];
  dutyEvents: DutyEvent[];
  ROW_POSITIONS: RowPositions;
  isSelectedDayToday: boolean;
  selectedDay: DateTime;
  GRAPH_SIZES: GraphSizes;
};

export default function drawLineGraph({
  ctx,
  dutyEvents,
  ROW_POSITIONS,
  mainEvents,
  interlocationEvents,
  isSelectedDayToday,
  selectedDay,
  GRAPH_SIZES,
}: DrawLineGraphProps) {
  const { paddingLeft, graphWidth, lineWidth, fontSize } = GRAPH_SIZES;
  dutyEvents.forEach((event, i) => {
    if (i === 0) return;
    const prev = dutyEvents[i - 1];
    if (prev.status === event.status) return;
    const x = paddingLeft + (event.startTime / 1440) * graphWidth;
    const y1 = ROW_POSITIONS[prev.status as EventCode];
    const y2 = ROW_POSITIONS[event.status as EventCode];
    ctx.strokeStyle = "#427dc0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, Math.min(y1, y2) - lineWidth / 2 + 2);
    ctx.lineTo(x, Math.max(y1, y2) + lineWidth / 2 - 2);
    ctx.stroke();
  });

  // DUTY BARS + LABELS
  dutyEvents.forEach((event, i) => {
    const x1 = paddingLeft + (event.startTime / 1440) * graphWidth;
    const x2 = paddingLeft + (event.endTime / 1440) * graphWidth;
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue(`--hos-${event.status}-bg`)
      .trim();
    ctx.fillRect(
      x1,
      ROW_POSITIONS[event.status as EventCode] - lineWidth / 2,
      x2 - x1,
      lineWidth,
    );

    const startTs =
      i === 0
        ? mainEvents[0].eventTime.timestamp
        : mainEvents[i].eventTime.timestamp;

    const endTs =
      mainEvents[i + 1]?.eventTime.timestamp ??
      (isSelectedDayToday
        ? DateTime.now().toMillis()
        : selectedDay.endOf("day").toMillis());

    const duration = Math.floor((endTs - startTs) / 60000);

    const centerX = (x1 + x2) / 2;
    const y = ROW_POSITIONS[event.status as EventCode];
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;

    if (i === 0) {
      const realDuration = mainEvents[1]
        ? Math.floor(
            (mainEvents[1].eventTime.timestamp -
              mainEvents[0].eventTime.timestamp) /
              60000,
          )
        : isSelectedDayToday
          ? Math.floor(
              (DateTime.now().toMillis() - mainEvents[0].eventTime.timestamp) /
                60000,
            )
          : Math.floor(
              (selectedDay.endOf("day").toMillis() -
                mainEvents[0].eventTime.timestamp) /
                60000,
            );
      ctx.fillText(
        `${minutesToHours(duration)} (${minutesToHours(realDuration)})`,
        centerX,
        y - lineWidth * 2,
      );
    } else if (duration > 15) {
      ctx.fillText(
        minutesToHours(duration),
        centerX,
        event.status === "DS_ON" ? y + lineWidth * 3 : y - lineWidth * 2,
      );
    }

    // mph
    if (
      event.status === "DS_D" &&
      duration >= 15 &&
      event.nextMiles != null &&
      event.miles != null
    ) {
      const mph = Math.floor((event.nextMiles - event.miles) / (duration / 60));

      const points = [
        mainEvents[i],
        ...interlocationEvents.filter((e) => {
          const ts = e.eventTime.timestamp;
          return ts > startTs && ts < endTs;
        }),
        mainEvents[i + 1],
      ].filter(Boolean);

      const limits = points
        .slice(0, -1)
        .map((e) =>
          getStateFromCalculatedLocation(e.location?.calculatedLocation),
        )
        .map((state) => (state ? getStateSpeedLimit(state) : null))
        .filter((limit) => limit != null);

      const speedLimit = limits.length
        ? Math.floor(
            limits.reduce((sum, limit) => sum + limit, 0) / limits.length,
          )
        : null;

      if (mph > 0 && speedLimit != null) {
        const styles = getComputedStyle(document.documentElement);
        const warningColor = styles.getPropertyValue("--error").trim();
        ctx.fillStyle =
          mph > speedLimit ? warningColor : GRAPH_STATUS_COLORS["DS_D"];
        ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
        ctx.fillText(`${mph} mph`, centerX, y + 2 + lineWidth * 4);
      }
    }
  });
}
