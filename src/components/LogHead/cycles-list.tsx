import { DateTime } from "luxon";
import { msToHHMM } from "../hos-gauge";
import type { HosTimers } from "@/lib/hos/calculations-old";
import { useState } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { RiExpandUpDownFill } from "react-icons/ri";
import { cn } from "@/lib/utils";
import { msToHHMMSS } from "@/lib/helpers";
import { Badge } from "../ui/badge";

type CycleListProps = {
  hosTimers: HosTimers;
  selectedDay: DateTime<true>;
  setSelectedDay: any;
};

export const CycleList = ({
  hosTimers,
  selectedDay,
  setSelectedDay,
}: CycleListProps) => {
  const selectedTs = selectedDay.toMillis();

  const displayCycles = [...hosTimers.cycleStates].reverse();

  const indexedCycles = displayCycles.map((cycle, index) => ({
    ...cycle,
    number: index + 1,
  }));

  const activeCycleIndex = indexedCycles.findIndex(
    (cycle) => selectedTs >= cycle.startTs,
  );

  const previewCycles = indexedCycles
    .slice(activeCycleIndex, activeCycleIndex + 3)
    .filter(Boolean);
  const previewSet = new Set(previewCycles.map((c) => c.startTs));
  return (
    <HoverCard openDelay={0}>
      <HoverCardTrigger asChild>
        <div className="flex cursor-pointer items-center justify-center gap-2 text-sm">
          <RiExpandUpDownFill size={18} />
          <div className="flex flex-col items-start">
            {previewCycles.map((cstate) => (
              <Badge
                variant="outline"
                onClick={() =>
                  setSelectedDay(DateTime.fromMillis(cstate.startTs))
                }
                key={cstate.startTs}
                className={cn("hover:bg-muted my-px pl-[1px]")}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full bg-black text-white",
                    cstate.isRecap && "bg-[var(--recap)]",
                    !cstate.isRecap && "bg-[var(--cycle)]",
                  )}
                >
                  {cstate.isRecap ? "R" : "C"}
                </span>
                {cstate.number}. {msToHHMMSS(cstate.usedMs)} -{" "}
                {cstate.startTs
                  ? DateTime.fromMillis(cstate.startTs).toFormat("MMM dd")
                  : "Unknown"}
              </Badge>
            ))}
          </div>
        </div>
      </HoverCardTrigger>

      <HoverCardContent
        align="start"
        className="flex w-fit flex-col items-start gap-1"
      >
        {indexedCycles.map((cstate) => {
          const highlighted = previewSet.has(cstate.startTs);
          return (
            <Badge
              variant="outline"
              onClick={() =>
                setSelectedDay(DateTime.fromMillis(cstate.startTs))
              }
              key={cstate.startTs}
              className={cn(
                "flex w-full cursor-pointer justify-start gap-2 rounded px-1 text-start text-sm",
                highlighted && "bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full bg-black text-white",
                  cstate.isRecap && "bg-[var(--recap)]",
                  !cstate.isRecap && "bg-[var(--cycle)]",
                )}
              >
                {cstate.isRecap ? "R" : "C"}
              </span>
              <span className="w-2">{cstate.number}.</span>
              <span>
                {msToHHMMSS(cstate.usedMs)} -{" "}
                {cstate.startTs
                  ? DateTime.fromMillis(cstate.startTs).toFormat(
                      "MMM dd hh:mm a",
                    )
                  : "Unknown"}
              </span>
            </Badge>
          );
        })}
      </HoverCardContent>
    </HoverCard>
  );
};

export default CycleList;
