import { getNoteIcons, timestampToMinutes } from "@/lib/helpers";
import { DateTime } from "luxon";
import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { ICON_SIZES, mainEventCodes } from "@/lib/maps";
import { BiSolidCertification, BiLogIn, BiLogOut } from "react-icons/bi";
import { TbEngine, TbEngineOff } from "react-icons/tb";
import { TiUpload, TiDownload } from "react-icons/ti";
import { BsFuelPumpFill } from "react-icons/bs";
import { cn } from "@/lib/utils";
import drawGrid from "./draw-grid";
import drawLabels from "./draw-labels";
import drawLineGraph from "./draw-line-graph";
import type { HosEvent } from "@/lib/types";
import type { IconType } from "react-icons/lib";
import type { DutyEvent, EventCode } from "./types";
import { isActiveEvent, isDutyEvent } from "@/lib/hos/helpers";
import type { Violation } from "@/lib/hos/calculations";
import drawViolationOverlay from "./drawViolationOverlay";

type ELDGraphProps = {
  selectedDay: DateTime<true> | DateTime<false>;
  events: HosEvent[];
  sliderSelection: {
    start: number;
    end: number;
  };
  setSliderSelection: React.Dispatch<
    React.SetStateAction<{
      start: number;
      end: number;
    }>
  >;
  sliderActive: boolean;
  setSliderActive: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  focusedId: string | null;
  setFocusedId: React.Dispatch<React.SetStateAction<string | null>>;
  violations: Violation[];
};

const ICON_COLORS: Record<string, string> = {
  ENG_UP_NORMAL: "#0a720a",
  ENG_DOWN_NORMAL: "#be1818",
  DR_CERT_1: "#1b18be",
  DR_LOGIN: "#0a720a",
  DR_LOGOUT: "#be1818",
};

const ICON_MAP: Record<string, IconType> = {
  ENG_UP_NORMAL: TbEngine,
  ENG_DOWN_NORMAL: TbEngineOff,
  DR_CERT_1: BiSolidCertification,
  DR_LOGIN: BiLogIn,
  DR_LOGOUT: BiLogOut,
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

const STOP_CODES = new Set(["DS_OFF", "DS_ON", "DS_SB"]);

function minutesToX(minutes: number) {
  return GRAPH_SIZES.paddingLeft + (minutes / 1440) * GRAPH_SIZES.graphWidth;
}

const ROW_FRACTIONS = { DS_OFF: 0.13, DS_SB: 0.38, DS_D: 0.63, DS_ON: 0.88 };

export default function ELDGraph({
  selectedDay,
  events,
  sliderSelection,
  setSliderSelection,
  sliderActive,
  setSliderActive,
  setSelectedIds,
  focusedId,
  setFocusedId,
  violations,
}: ELDGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useRef<number | null>(null);
  const isDragging = useRef<null | "start" | "end">(null);
  const sliderSelectionRef = useRef(sliderSelection);
  const sliderActiveRef = useRef(sliderActive);
  const isSelectedDayToday = selectedDay.hasSame(DateTime.now(), "day");
  const didDrag = useRef(false);
  const [hoveredViolation, setHoveredViolation] = useState<Violation | null>(
    null,
  );

  useEffect(() => {
    sliderSelectionRef.current = sliderSelection;
  }, [sliderSelection]);
  useEffect(() => {
    sliderActiveRef.current = sliderActive;
  }, [sliderActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = GRAPH_SIZES.canvasWidth;
    canvas.height = GRAPH_SIZES.canvasHeight;
  }, []);

  useEffect(() => {
    function handleOutsideCanvasClick(e: MouseEvent) {
      const target = e.target as Node;

      if (!canvasRef.current?.contains(target)) {
        setFocusedId(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideCanvasClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideCanvasClick);
    };
  }, []);

  const xToMinutes = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (GRAPH_SIZES.canvasWidth / rect.width);
    return Math.max(
      0,
      Math.min(
        1440,
        ((x - GRAPH_SIZES.paddingLeft) / GRAPH_SIZES.graphWidth) * 1440,
      ),
    );
  };

  const mainEvents = events.filter((e) => isDutyEvent(e) && isActiveEvent(e));
  const otherEvents = events.filter(
    (e) => !mainEventCodes.includes(e.eventCode.id),
  );

  function transformData(): DutyEvent[] {
    const now = DateTime.now();
    return mainEvents.map((event, i): DutyEvent => {
      const next = mainEvents[i + 1];
      const currentMinutes = now.hour * 60 + now.minute;
      const nextStop = mainEvents
        .slice(i + 1)
        .find((e) => STOP_CODES.has(e.eventCode.id));
      return {
        startTime: i === 0 ? 0 : timestampToMinutes(event.eventTime.timestamp),
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
  }

  const dutyEvents = useMemo(
    () => transformData(),
    [mainEvents, isSelectedDayToday],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (didDrag.current) {
        didDrag.current = false;
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX =
        (e.clientX - rect.left) * (GRAPH_SIZES.canvasWidth / rect.width);

      const clickedEvent = [...mainEvents]
        .reverse()
        .find((event, reversedIndex) => {
          const i = mainEvents.length - 1 - reversedIndex;

          const minutes =
            i === 0 ? 0 : timestampToMinutes(event.eventTime.timestamp);

          const eventX = minutesToX(minutes);

          return clickX >= eventX;
        });

      if (clickedEvent) {
        requestAnimationFrame(() => {
          const row = document.getElementById(`row-${clickedEvent._id}`);

          row?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });

          draw();
        });

        setFocusedId(clickedEvent._id);
      }
    },
    [mainEvents],
  );

  const ROW_POSITIONS = Object.fromEntries(
    Object.entries(ROW_FRACTIONS).map(([k, f]) => [
      k,
      GRAPH_SIZES.paddingTop + f * GRAPH_SIZES.graphHeight,
    ]),
  );

  const dayStart = selectedDay.startOf("day").toMillis();
  const dayEnd = selectedDay.endOf("day").toMillis();

  const currentDayVios = violations.filter((v) => {
    const vStart = v.startTs;
    const vEnd = v.endTs ?? Date.now();

    return vStart < dayEnd && vEnd > dayStart;
  });
  console.log({ currentDayVios });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, GRAPH_SIZES.canvasWidth, GRAPH_SIZES.canvasHeight);

    const mx = mouseX.current;

    const hoveredEvent =
      mx !== null && !isDragging.current
        ? dutyEvents.find((e) => {
            const x1 =
              GRAPH_SIZES.paddingLeft +
              (e.startTime / 1440) * GRAPH_SIZES.graphWidth;

            const x2 =
              GRAPH_SIZES.paddingLeft +
              (e.endTime / 1440) * GRAPH_SIZES.graphWidth;

            return mx >= x1 && mx <= x2;
          })
        : null;

    const focusedEvent = focusedId
      ? dutyEvents.find((_, i) => mainEvents[i]?._id === focusedId)
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
      isSelectedDayToday,
      selectedDay,
      GRAPH_SIZES,
    });
    drawViolationOverlay({
      ctx,
      violation: hoveredViolation,
      dayStart,
      dayEnd,
      GRAPH_SIZES,
    });

    // SELECTED
    if (focusedEvent) {
      const x1 =
        GRAPH_SIZES.paddingLeft +
        (focusedEvent.startTime / 1440) * GRAPH_SIZES.graphWidth;
      const x2 =
        GRAPH_SIZES.paddingLeft +
        (focusedEvent.endTime / 1440) * GRAPH_SIZES.graphWidth;

      ctx.fillStyle = "rgba(59, 130, 246, 0.14)";
      ctx.fillRect(
        x1,
        GRAPH_SIZES.paddingTop,
        x2 - x1,
        GRAPH_SIZES.graphHeight,
      );

      ctx.shadowColor = "rgba(59, 130, 246, 0.25)";
      ctx.shadowBlur = 12;

      ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
      ctx.fillRect(
        x1,
        GRAPH_SIZES.paddingTop,
        x2 - x1,
        GRAPH_SIZES.graphHeight,
      );

      ctx.shadowBlur = 0;
    }

    // HOVER
    if (hoveredEvent && hoveredEvent !== focusedEvent) {
      const x1 =
        GRAPH_SIZES.paddingLeft +
        (hoveredEvent.startTime / 1440) * GRAPH_SIZES.graphWidth;
      const x2 =
        GRAPH_SIZES.paddingLeft +
        (hoveredEvent.endTime / 1440) * GRAPH_SIZES.graphWidth;
      ctx.fillStyle = "rgba(96, 165, 250, 0.08)";
      ctx.fillRect(
        x1,
        GRAPH_SIZES.paddingTop,
        x2 - x1,
        GRAPH_SIZES.graphHeight,
      );
    }

    // dashed lines
    otherEvents.forEach((event) => {
      const minutes = timestampToMinutes(event.eventTime.timestamp);
      const x = minutesToX(minutes);

      // Interlocations
      if (
        event.eventCode.id === "LOG_NORMAL_PRECISION" ||
        event.eventCode.id === "LOG_REDUCED_PRECISION"
      ) {
        ctx.strokeStyle = "#4b4b4b";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(x, ROW_POSITIONS["DS_D"] - 10); // start a bit below top
        ctx.lineTo(x, ROW_POSITIONS["DS_D"] + 10); // end a bit above bottom
        ctx.stroke();
      } else {
        const color = ICON_COLORS[event.eventCode.id];
        if (!color) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x, GRAPH_SIZES.paddingTop);
        ctx.lineTo(x, GRAPH_SIZES.paddingTop + GRAPH_SIZES.graphHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // SLIDER
    if (sliderActiveRef.current) {
      const sel = sliderSelectionRef.current;
      const start = Math.min(sel.start, sel.end);
      const end = Math.max(sel.start, sel.end);
      const x1 =
        GRAPH_SIZES.paddingLeft + (start / 1440) * GRAPH_SIZES.graphWidth;
      const x2 =
        GRAPH_SIZES.paddingLeft + (end / 1440) * GRAPH_SIZES.graphWidth;
      const selectionWidth = x2 - x1;

      ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
      ctx.fillRect(
        x1,
        GRAPH_SIZES.paddingTop,
        selectionWidth,
        GRAPH_SIZES.graphHeight,
      );

      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(
        x1 + 1,
        GRAPH_SIZES.paddingTop + 1,
        selectionWidth - 2,
        GRAPH_SIZES.graphHeight - 2,
      );

      const handleWidth = Math.max(5, GRAPH_SIZES.graphHeight * 0.04);
      const handleHeight = Math.max(20, GRAPH_SIZES.graphHeight * 0.18);

      [x1, x2].forEach((x) => {
        ctx.fillStyle = "#1e40af";
        ctx.fillRect(
          x - handleWidth / 2,
          GRAPH_SIZES.paddingTop + (GRAPH_SIZES.graphHeight - handleHeight) / 2,
          handleWidth,
          handleHeight,
        );
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          x - handleWidth / 2,
          GRAPH_SIZES.paddingTop + (GRAPH_SIZES.graphHeight - handleHeight) / 2,
          handleWidth,
          handleHeight,
        );
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, GRAPH_SIZES.paddingTop + GRAPH_SIZES.graphHeight * 0.1);
        ctx.lineTo(x, GRAPH_SIZES.paddingTop + GRAPH_SIZES.graphHeight * 0.9);
        ctx.stroke();
      });
    }
  }, [
    selectedDay,
    events,
    isSelectedDayToday,
    mainEvents,
    otherEvents,
    focusedId,
    dutyEvents,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        sliderSelectionRef.current = { start: 0, end: 0 };
        sliderActiveRef.current = false;
        setSliderSelection({ start: 0, end: 0 });
        setSliderActive(false);
        setSelectedIds(new Set());
        requestAnimationFrame(draw);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [draw]);

  useEffect(() => {
    if (!isSelectedDayToday) return;

    let timeout: ReturnType<typeof setTimeout>;

    const schedule = () => {
      requestAnimationFrame(draw);

      const now = Date.now();
      const delay = 60000 - (now % 60000);

      timeout = setTimeout(schedule, delay);
    };

    schedule();

    return () => clearTimeout(timeout);
  }, [draw, isSelectedDayToday]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleIconClick = (e: React.MouseEvent, event: HosEvent) => {
    e.stopPropagation();

    requestAnimationFrame(() => {
      const row = document.getElementById(`row-${event._id}`);

      row?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    setFocusedId(event._id);
  };

  const noteEvents = events.filter((e) => e.eventComment);
  return (
    <>
      <div className="relative mx-auto w-full max-w-[1800px]">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={(e) => {
            didDrag.current = false;
            if (!e.shiftKey) {
              isDragging.current = null;
              return;
            }

            const minutes = xToMinutes(e.clientX);

            sliderActiveRef.current = true;

            sliderSelectionRef.current = {
              start: minutes,
              end: minutes,
            };

            isDragging.current = "end";
            requestAnimationFrame(draw);
          }}
          onMouseMove={(e) => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();

            mouseX.current =
              (e.clientX - rect.left) * (GRAPH_SIZES.canvasWidth / rect.width);

            if (isDragging.current) {
              didDrag.current = true;
              const minutes = xToMinutes(e.clientX);

              sliderSelectionRef.current = {
                ...sliderSelectionRef.current,
                [isDragging.current]: minutes,
              };

              // canvas-only redraw
              requestAnimationFrame(draw);
            } else {
              requestAnimationFrame(draw);
            }
          }}
          onMouseUp={() => {
            if (isDragging.current) {
              setSliderActive(sliderActiveRef.current);

              setSliderSelection({
                ...sliderSelectionRef.current,
              });
            }

            isDragging.current = null;
          }}
          onMouseLeave={() => {
            mouseX.current = null;

            if (isDragging.current) {
              setSliderActive(sliderActiveRef.current);

              setSliderSelection({
                ...sliderSelectionRef.current,
              });
            }

            isDragging.current = null;

            requestAnimationFrame(draw);
          }}
        />
        <div
          className="absolute"
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
            const Icon = ICON_MAP[event.eventCode.id];
            const color = ICON_COLORS[event.eventCode.id];
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
                  top: GRAPH_SIZES.canvasHeight - GRAPH_SIZES.paddingBottom + 4,
                  height: 28,
                  transform: `translateX(-50%) scale(${focusedId === event._id ? 1.1 : 1})`,
                  pointerEvents: "auto",
                }}
                onClick={(e) => handleIconClick(e, event)}
              >
                <Icon color={color} size={ICON_SIZES.default} />
              </div>
            );
          })}
          {noteEvents.map((event) => {
            const note = getNoteIcons(event.eventComment);
            if (!note) return null;

            const parentDutyEvent = dutyEvents.find(
              (_, i) => mainEvents[i]?._id === event._id,
            );

            const centerMinutes = parentDutyEvent
              ? (parentDutyEvent.startTime + parentDutyEvent.endTime) / 2
              : timestampToMinutes(event.eventTime.timestamp);

            const x = minutesToX(centerMinutes);

            return (
              <div
                key={event._id}
                className={cn(
                  "absolute flex cursor-pointer items-center justify-center rounded-full transition-all duration-200",
                  note.icons.length > 1 ? "w-6 gap-1" : "w-6",
                  focusedId === event._id
                    ? "bg-blue-100 shadow-md ring-2 ring-blue-300"
                    : "hover:bg-blue-100",
                )}
                style={{
                  left: x,
                  top:
                    GRAPH_SIZES.canvasHeight - GRAPH_SIZES.paddingBottom + 24,
                  height: 24,
                  transform: `translateX(-50%) scale(${focusedId === event._id ? 1.05 : 1})`,
                  pointerEvents: "auto",
                }}
                onClick={(e) => handleIconClick(e, event)}
              >
                {note.icons.map(({ Icon, color, size }, i) => (
                  <Icon
                    key={i}
                    color={color}
                    size={size ?? ICON_SIZES.default} // ← bigger
                  />
                ))}
              </div>
            );
          })}
        </div>
        <div
          className="flex gap-2"
          style={{ paddingLeft: GRAPH_SIZES.paddingLeft }}
        >
          {currentDayVios.map((v, i) => (
            <div
              key={`${v.rule}-${v.startTs}-${i}`}
              onMouseEnter={() => setHoveredViolation(v)}
              onMouseLeave={() => setHoveredViolation(null)}
              className="w-fit rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-500"
            >
              ⚠ {v.rule} violation at{" "}
              {DateTime.fromMillis(v.startTs).toFormat("MM/dd hh:mm:ss a")}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
