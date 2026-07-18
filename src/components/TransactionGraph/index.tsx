import { isActiveEvent, isDutyEvent } from "@/lib/hos/helpers";
import { isInterlocationEvent } from "@/lib/log-check/helpers/status-type-checks";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { DutyEvent, EventCode } from "../Graph/types";
import { timestampToMinutes } from "@/lib/helpers";
import drawGrid from "../Graph/draw-grid";
import drawLabels from "../Graph/draw-labels";
import drawLineGraph from "../Graph/draw-line-graph";
import type { HosEvent } from "@/lib/types";
import { getIcon, getIconColor, minutesToX, STOP_CODES } from "../Graph";
import { ICON_SIZES, mainEventCodes } from "@/lib/maps";
import { cn } from "@/lib/utils";

type TransactionGraphProps = {
  selectedDay: DateTime;
  events: HosEvent[];
  focusedId: string | null;
  focusEvent: (eventId: string) => void;
};

const GRAPH_SIZES = (() => {
  const canvasWidth = 1800;
  const canvasHeight = 260;

  const paddingLeft = 80;
  const paddingRight = 80;
  const paddingTop = 30;
  const paddingBottom = 30;

  const graphWidth = canvasWidth - paddingLeft - paddingRight;

  const graphHeight = canvasHeight - paddingTop - paddingBottom;

  return {
    canvasWidth,
    canvasHeight,

    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,

    graphWidth,
    graphHeight,

    lineWidth: Math.max(3, graphHeight * 0.025),

    fontSize: Math.max(11, Math.round(graphHeight * 0.075)),
  };
})();
const ROW_FRACTIONS = { DS_OFF: 0.13, DS_SB: 0.38, DS_D: 0.63, DS_ON: 0.88 };
const ROW_POSITIONS = Object.fromEntries(
  Object.entries(ROW_FRACTIONS).map(([key, fraction]) => [
    key,
    GRAPH_SIZES.paddingTop + fraction * GRAPH_SIZES.graphHeight,
  ]),
);
export function TransactionGraph({
  selectedDay,
  events,
  focusedId,
  focusEvent,
}: TransactionGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useRef<number | null>(null);
  const mainEvents = events.filter(
    (event) => isDutyEvent(event) && isActiveEvent(event),
  );
  const otherEvents = events.filter(
    (e) => !mainEventCodes.includes(e.eventCode.id),
  );

  const interlocationEvents = events.filter((event) =>
    isInterlocationEvent(event),
  );

  const isSelectedDayToday = selectedDay.hasSame(DateTime.now(), "day");

  const dutyEvents = useMemo(() => {
    const now = DateTime.now();

    return mainEvents.map((event, index): DutyEvent => {
      const next = mainEvents[index + 1];

      const currentMinutes = now.hour * 60 + now.minute;

      const nextStop = mainEvents
        .slice(index + 1)
        .find((event) => STOP_CODES.has(event.eventCode.id));

      return {
        startTime:
          index === 0 ? 0 : timestampToMinutes(event.eventTime.timestamp),

        endTime: next
          ? timestampToMinutes(next.eventTime.timestamp)
          : isSelectedDayToday
            ? currentMinutes
            : 1440,

        status: event.eventCode.id as EventCode,

        miles: event.totalVehicleMiles ?? null,
        nextMiles: nextStop?.totalVehicleMiles ?? null,
      };
    });
  }, [mainEvents, isSelectedDayToday]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, GRAPH_SIZES.canvasWidth, GRAPH_SIZES.canvasHeight);

    const mx = mouseX.current;

    const hoveredEvent =
      mx !== null
        ? dutyEvents.find((event) => {
            const x1 = minutesToX(event.startTime);
            const x2 = minutesToX(event.endTime);

            return mx >= x1 && mx <= x2;
          })
        : null;

    const focusedEvent = focusedId
      ? dutyEvents.find((_, index) => mainEvents[index]?._id === focusedId)
      : null;

    drawGrid({
      ctx,
      ROW_POSITIONS,
      GRAPH_SIZES,
    });

    drawLabels({
      ctx,
      ROW_POSITIONS,
      events,
      selectedDay,
      GRAPH_SIZES,
    });

    drawLineGraph({
      ctx,
      dutyEvents,
      ROW_POSITIONS,
      mainEvents,
      interlocationEvents,
      isSelectedDayToday,
      selectedDay,
      GRAPH_SIZES,
    });

    otherEvents.forEach((event) => {
      const minutes = timestampToMinutes(event.eventTime.timestamp);
      const x = minutesToX(minutes);

      if (
        event.eventCode.id === "LOG_NORMAL_PRECISION" ||
        event.eventCode.id === "LOG_REDUCED_PRECISION"
      ) {
        ctx.strokeStyle = "#4b4b4b";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(x, ROW_POSITIONS.DS_D - 8);
        ctx.lineTo(x, ROW_POSITIONS.DS_D + 8);
        ctx.stroke();

        return;
      }

      const color = getIconColor(event.eventCode.id);
      if (!color) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);

      ctx.beginPath();
      ctx.moveTo(x, GRAPH_SIZES.paddingTop);
      ctx.lineTo(x, GRAPH_SIZES.paddingTop + GRAPH_SIZES.graphHeight);
      ctx.stroke();

      ctx.setLineDash([]);
    });

    if (focusedEvent) {
      const x1 = minutesToX(focusedEvent.startTime);
      const x2 = minutesToX(focusedEvent.endTime);

      ctx.fillStyle = "rgba(59, 130, 246, 0.14)";
      ctx.fillRect(
        x1,
        GRAPH_SIZES.paddingTop,
        x2 - x1,
        GRAPH_SIZES.graphHeight,
      );
    }

    if (hoveredEvent && hoveredEvent !== focusedEvent) {
      const x1 = minutesToX(hoveredEvent.startTime);
      const x2 = minutesToX(hoveredEvent.endTime);

      ctx.fillStyle = "rgba(96, 165, 250, 0.08)";
      ctx.fillRect(
        x1,
        GRAPH_SIZES.paddingTop,
        x2 - x1,
        GRAPH_SIZES.graphHeight,
      );
    }
  }, [
    events,
    selectedDay,
    focusedId,
    dutyEvents,
    mainEvents,
    otherEvents,
    interlocationEvents,
    isSelectedDayToday,
    ROW_POSITIONS,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      const clickX =
        (event.clientX - rect.left) * (GRAPH_SIZES.canvasWidth / rect.width);

      const clickedEvent = [...mainEvents]
        .reverse()
        .find((event, reversedIndex) => {
          const index = mainEvents.length - 1 - reversedIndex;

          const startMinutes =
            index === 0 ? 0 : timestampToMinutes(event.eventTime.timestamp);

          return clickX >= minutesToX(startMinutes);
        });

      if (!clickedEvent) return;

      focusEvent(clickedEvent._id);
    },
    [mainEvents, focusEvent],
  );

  const handleIconClick = (
    e: React.MouseEvent<HTMLDivElement>,
    event: HosEvent,
  ) => {
    e.stopPropagation();
    focusEvent(event._id);
  };

  return (
    <div className="relative mx-auto w-[1800px]">
      <canvas
        ref={canvasRef}
        width={GRAPH_SIZES.canvasWidth}
        height={GRAPH_SIZES.canvasHeight}
        className="block h-auto w-full"
        onMouseMove={(event) => {
          const canvas = canvasRef.current;
          if (!canvas) return;

          const rect = canvas.getBoundingClientRect();

          mouseX.current =
            (event.clientX - rect.left) *
            (GRAPH_SIZES.canvasWidth / rect.width);

          requestAnimationFrame(draw);
        }}
        onMouseLeave={() => {
          mouseX.current = null;
          requestAnimationFrame(draw);
        }}
        onClick={handleCanvasClick}
      />
      <div
        className="absolute inset-0"
        style={{
          top: 0,
          left: 0,
          width: `${GRAPH_SIZES.canvasWidth}px`,
          height: `${GRAPH_SIZES.canvasHeight}px`,
          pointerEvents: "none",
        }}
      >
        {otherEvents.map((event) => {
          const minutes = timestampToMinutes(event.eventTime.timestamp);
          const x = minutesToX(minutes);
          const Icon = getIcon(event.eventCode.id);
          const color = getIconColor(event.eventCode.id);
          if (!Icon) return null;

          return (
            <div
              key={event._id}
              className={cn(
                "absolute cursor-pointer rounded-full p-1 transition-all duration-200",
                focusedId === event._id
                  ? "bg-blue-100 shadow-md ring-2 ring-blue-300"
                  : "hover:bg-blue-100",
              )}
              style={{
                left: x,
                top: GRAPH_SIZES.canvasHeight - GRAPH_SIZES.paddingBottom,
                height: 28,
                transform: `translateX(-50%) scale(${
                  focusedId === event._id ? 1.1 : 1
                })`,
                pointerEvents: "auto",
              }}
              onClick={(e) => handleIconClick(e, event)}
            >
              <Icon color={color} size={ICON_SIZES.default} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
