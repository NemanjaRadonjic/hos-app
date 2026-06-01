import { isDriving, isOnDuty, isRest } from "./helpers";
import { buildSegments, type Segment } from "./segments";
import type { HosEvent } from "../types";
import { DateTime } from "luxon";

export type CycleState = {
  startTs: number;
  endTs: number;

  usedMs: number;
  remainingMs: number;

  isRecap: boolean;
  complete: boolean;
};

export type HosTimers = {
  cycleStates: CycleState[];

  currentCycle: {
    usedMs: number;
    remainingMs: number;
  };

  driveState: {
    usedMs: number;
    remainingMs: number;
  };

  shiftState: {
    usedMs: number;
    remainingMs: number;
  };

  breakState: {
    usedMs: number;
    remainingMs: number;
  };
};

const MINUTE_MS = 60 * 1000;

const CYCLE_LIMIT_MS = 70 * 60 * MINUTE_MS;
const ELEVEN_HOURS_MS = 11 * 60 * MINUTE_MS;
const FOURTEEN_HOURS_MS = 14 * 60 * MINUTE_MS;
const EIGHT_HOURS_MS = 8 * 60 * MINUTE_MS;
const THIRTY_MIN_MS = 30 * MINUTE_MS;
const RESTART_34H_MS = 34 * 60 * 60 * 1000;
const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;
const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

const fmt = (ts: number) =>
  DateTime.fromMillis(ts).toFormat("MMM d, h:mm:ss a");

function getResetEndTs(
  segments: Segment[],
  currentIndex: number,
): number | null {
  let consecutiveRestMs = 0;
  let restBlockEndTs: number | null = null;

  for (let i = currentIndex; i < segments.length; i++) {
    const seg = segments[i];

    if (isRest(seg)) {
      if (
        seg.status === "DS_SB" &&
        seg.durationMs >= 7 * 60 * 60 * 1000 &&
        seg.durationMs < TEN_HOURS_MS
      ) {
        const minSmall =
          seg.durationMs < 8 * 60 * 60 * 1000
            ? 3 * 60 * 60 * 1000
            : 2 * 60 * 60 * 1000;

        for (let j = i - 1; j >= currentIndex; j--) {
          const prev = segments[j];
          if (isRest(prev) && prev.durationMs >= TEN_HOURS_MS) break;
          if (prev.status === "DS_SB" && prev.durationMs >= 7 * 60 * 60 * 1000)
            break;

          if (
            (prev.status === "DS_SB" || prev.status === "DS_OFF") &&
            prev.durationMs >= minSmall &&
            prev.durationMs < TEN_HOURS_MS
          ) {
            return seg.endTs;
          }
        }
      }

      if (restBlockEndTs === null) restBlockEndTs = seg.endTs;
      consecutiveRestMs += seg.durationMs;

      if (consecutiveRestMs >= TEN_HOURS_MS) {
        return seg.endTs;
      }
    } else {
      consecutiveRestMs = 0;
      restBlockEndTs = null;
    }
  }

  return null;
}

function isCycleResetRest(seg: Segment) {
  return seg.status === "DS_OFF" || seg.status === "DS_SB";
}

function ctMidnight(tsMs: number): number {
  return DateTime.fromMillis(tsMs, { zone: "America/Chicago" })
    .startOf("day")
    .toMillis();
}

function sumOnDutyInWindow(
  segments: Segment[],
  windowStartTs: number,
  endTs: number,
): number {
  let used = 0;
  for (const seg of segments) {
    if (seg.endTs <= windowStartTs) continue;
    if (seg.startTs >= endTs) break;
    if (!isOnDuty(seg)) continue;

    const from = Math.max(seg.startTs, windowStartTs);
    const to = Math.min(seg.endTs, endTs);
    used += to - from;
  }
  return used;
}

function recapWindowUsed(
  segments: Segment[],
  nowTs: number,
): { usedMs: number; remainingMs: number } {
  const todayMidnight = ctMidnight(nowTs);
  const windowStartTs = todayMidnight - 7 * 24 * 60 * 60 * 1000;
  const usedMs = sumOnDutyInWindow(segments, windowStartTs, nowTs);
  return {
    usedMs,
    remainingMs: Math.max(0, CYCLE_LIMIT_MS - usedMs),
  };
}

function buildCycleStates(segments: Segment[]): CycleState[] {
  if (segments.length === 0) return [];

  const states: CycleState[] = [];

  let currentStartTs: number | null = null;
  let usedMs = 0;
  let consecutiveRestMs = 0;
  let hadQualifyingRest = false;
  let initialized = false;
  let restBlockStartTs: number | null = null;
  let restBlockEndTs: number | null = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (isCycleResetRest(seg)) {
      if (consecutiveRestMs === 0) {
        restBlockStartTs = seg.startTs;
      }
      consecutiveRestMs += seg.durationMs;

      if (consecutiveRestMs >= RESTART_34H_MS && !hadQualifyingRest) {
        hadQualifyingRest = true;
        restBlockEndTs = seg.endTs;
      }
    } else {
      if (!hadQualifyingRest) {
        consecutiveRestMs = 0;
        restBlockStartTs = null;
        restBlockEndTs = null;
      }
    }

    if (!initialized) {
      if (isOnDuty(seg)) {
        usedMs += seg.durationMs;
      }

      if (hadQualifyingRest) {
        const recapEnd = restBlockStartTs!;
        const windowStart = segments[0].startTs;
        const periodDays = DateTime.fromMillis(recapEnd).diff(
          DateTime.fromMillis(windowStart),
          "days",
        ).days;

        const isRecap = periodDays >= 8;
        const eightDaysAgoMs = recapEnd - EIGHT_DAYS_MS;

        const recapUsedMs = segments.reduce((acc, s) => {
          if (!isOnDuty(s)) return acc;
          if (s.endTs <= eightDaysAgoMs) return acc;
          if (s.startTs >= recapEnd) return acc;
          const from = Math.max(s.startTs, eightDaysAgoMs);
          const to = Math.min(s.endTs, recapEnd);
          return acc + (to - from);
        }, 0);

        states.push({
          startTs: isRecap ? eightDaysAgoMs : null,
          endTs: recapEnd,
          usedMs: recapUsedMs,
          remainingMs: Math.max(0, CYCLE_LIMIT_MS - recapUsedMs),
          isRecap,
          complete: isRecap,
        });

        initialized = true;
        currentStartTs = restBlockEndTs!;
        hadQualifyingRest = false;
        consecutiveRestMs = 0;
        usedMs = 0;
      }
      continue;
    }

    if (hadQualifyingRest) {
      const cycleStart = currentStartTs!;
      const cycleEnd = restBlockStartTs!;

      const startDay = DateTime.fromMillis(cycleStart, {
        zone: "America/Chicago",
      }).startOf("day");
      const endDay = DateTime.fromMillis(cycleEnd, {
        zone: "America/Chicago",
      }).startOf("day");
      const isRecap = endDay.diff(startDay, "days").days > 8;

      states.push({
        startTs: cycleStart,
        endTs: cycleEnd,
        usedMs,
        remainingMs: Math.max(0, CYCLE_LIMIT_MS - usedMs),
        isRecap,
        complete: true,
      });

      currentStartTs = restBlockEndTs!;
      usedMs = 0;
      hadQualifyingRest = false;
      consecutiveRestMs = 0;
      restBlockStartTs = null;
      restBlockEndTs = null;
    }

    if (isOnDuty(seg)) {
      usedMs += seg.durationMs;
    }
  }

  if (!initialized && segments.length > 0) {
    const cycleEnd = segments.at(-1)!.endTs;

    const eightDaysAgoMs = cycleEnd - 8 * 24 * 60 * 60 * 1000;

    const usedMs = segments.reduce((acc, seg) => {
      if (!isOnDuty(seg)) return acc;
      if (seg.endTs <= eightDaysAgoMs) return acc;

      const from = Math.max(seg.startTs, eightDaysAgoMs);
      const to = seg.endTs;
      return acc + (to - from);
    }, 0);

    states.push({
      startTs: eightDaysAgoMs,
      endTs: cycleEnd,
      usedMs,
      remainingMs: Math.max(0, CYCLE_LIMIT_MS - usedMs),
      isRecap: true,
      complete: true,
    });

    return states;
  }

  if (currentStartTs !== null) {
    const cycleStart = currentStartTs;
    const cycleEnd = segments.at(-1)!.endTs;

    if (hadQualifyingRest) {
      const startDay = DateTime.fromMillis(cycleStart, {
        zone: "America/Chicago",
      }).startOf("day");
      const endDay = DateTime.fromMillis(restBlockStartTs!, {
        zone: "America/Chicago",
      }).startOf("day");
      const isRecap = endDay.diff(startDay, "days").days > 8;

      states.push({
        startTs: cycleStart,
        endTs: restBlockStartTs!,
        usedMs,
        remainingMs: Math.max(0, CYCLE_LIMIT_MS - usedMs),
        isRecap,
        complete: true,
      });

      states.push({
        startTs: restBlockEndTs!,
        endTs: cycleEnd,
        usedMs: 0,
        remainingMs: CYCLE_LIMIT_MS,
        isRecap: false,
        complete: true,
      });

      return states;
    }

    const isRecap =
      DateTime.fromMillis(cycleEnd, { zone: "America/Chicago" })
        .startOf("day")
        .diff(
          DateTime.fromMillis(cycleStart, { zone: "America/Chicago" }).startOf(
            "day",
          ),
          "days",
        ).days > 8;

    let finalUsed: number;
    let finalRemaining: number;

    if (isRecap) {
      const recap = recapWindowUsed(segments, cycleEnd);
      finalUsed = recap.usedMs;
      finalRemaining = recap.remainingMs;
    } else {
      finalUsed = usedMs;
      finalRemaining = Math.max(0, CYCLE_LIMIT_MS - usedMs);
    }

    states.push({
      startTs: cycleStart,
      endTs: cycleEnd,
      usedMs: finalUsed,
      remainingMs: finalRemaining,
      isRecap,
      complete: true,
    });
  }

  return states;
}

export function calculateBreakClock(segments: Segment[], currentIndex: number) {
  let drivingMs = 0;
  let breakMs = 0;

  for (let i = currentIndex; i >= 0; i--) {
    const seg = segments[i];

    const isBreak =
      seg.status === "DS_OFF" ||
      seg.status === "DS_SB" ||
      seg.status === "DS_ON";

    if (isBreak) {
      breakMs += seg.endTs - seg.startTs;
      if (breakMs >= THIRTY_MIN_MS) break;
    } else {
      breakMs = 0;
    }

    if (isDriving(seg)) {
      drivingMs += seg.endTs - seg.startTs;
    }
  }

  return {
    usedMs: drivingMs,
    remainingMs: Math.max(0, EIGHT_HOURS_MS - drivingMs),
  };
}

export function calculateDrivingClock(
  segments: Segment[],
  currentIndex: number,
) {
  let drivingMs = 0;

  for (let i = currentIndex; i >= 0; i--) {
    const seg = segments[i];

    if (isRest(seg) && seg.durationMs >= TEN_HOURS_MS) break;

    if (
      seg.status === "DS_SB" &&
      seg.durationMs >= 7 * 60 * 60 * 1000 &&
      seg.durationMs < TEN_HOURS_MS
    ) {
      const minSmall =
        seg.durationMs < 8 * 60 * 60 * 1000
          ? 3 * 60 * 60 * 1000
          : 2 * 60 * 60 * 1000;

      for (let j = i + 1; j <= currentIndex; j++) {
        const next = segments[j];

        if (isRest(next) && next.durationMs >= TEN_HOURS_MS) break;
        if (next.status === "DS_SB" && next.durationMs >= 7 * 60 * 60 * 1000)
          break;

        if (
          (next.status === "DS_SB" || next.status === "DS_OFF") &&
          next.durationMs >= minSmall &&
          next.durationMs < TEN_HOURS_MS
        ) {
          return {
            usedMs: drivingMs,
            remainingMs: Math.max(0, ELEVEN_HOURS_MS - drivingMs),
          };
        }
      }
    }

    if (isDriving(seg)) {
      drivingMs += seg.endTs - seg.startTs;
    }
  }

  return {
    usedMs: drivingMs,
    remainingMs: Math.max(0, ELEVEN_HOURS_MS - drivingMs),
  };
}

export function calculateShiftClock(segments: Segment[], currentIndex: number) {
  const currentTs = segments[currentIndex].endTs;
  let excludedMs = 0;
  let i = currentIndex;
  let consecutiveRestMs = 0;
  let restBlockEndTs: number | null = null;

  while (i >= 0) {
    const seg = segments[i];

    if (isRest(seg)) {
      if (
        seg.status === "DS_SB" &&
        seg.durationMs >= 7 * 60 * 60 * 1000 &&
        seg.durationMs < TEN_HOURS_MS
      ) {
        const minSmall =
          seg.durationMs < 8 * 60 * 60 * 1000
            ? 3 * 60 * 60 * 1000
            : 2 * 60 * 60 * 1000;

        for (let j = i + 1; j <= currentIndex; j++) {
          const next = segments[j];

          if (isRest(next) && next.durationMs >= TEN_HOURS_MS) break;
          if (next.status === "DS_SB" && next.durationMs >= 7 * 60 * 60 * 1000)
            break;

          if (
            (next.status === "DS_SB" || next.status === "DS_OFF") &&
            next.durationMs >= minSmall &&
            next.durationMs < TEN_HOURS_MS
          ) {
            // valid split
            const usedMs = currentTs - seg.endTs - next.durationMs - excludedMs;
            return {
              usedMs,
              remainingMs: Math.max(0, FOURTEEN_HOURS_MS - usedMs),
            };
          }
        }

        excludedMs += seg.durationMs;
        consecutiveRestMs = 0;
        restBlockEndTs = null;
        i--;
        continue;
      }

      if (restBlockEndTs === null) restBlockEndTs = seg.endTs;
      consecutiveRestMs += seg.durationMs;

      if (consecutiveRestMs >= TEN_HOURS_MS) {
        const usedMs = currentTs - restBlockEndTs - excludedMs;
        return {
          usedMs,
          remainingMs: Math.max(0, FOURTEEN_HOURS_MS - usedMs),
        };
      }
    } else {
      consecutiveRestMs = 0;
      restBlockEndTs = null;
    }

    i--;
  }

  const shiftStartTs = segments[0]?.startTs ?? 0;
  const usedMs = currentTs - shiftStartTs - excludedMs;
  return {
    usedMs,
    remainingMs: Math.max(0, FOURTEEN_HOURS_MS - usedMs),
  };
}

export function getHosTimers(events: HosEvent[]): HosTimers {
  const segments = buildSegments(events);
  const cycleStates = buildCycleStates(segments);

  if (segments.length === 0) {
    return {
      cycleStates: [],
      currentCycle: { usedMs: 0, remainingMs: CYCLE_LIMIT_MS },
      driveState: { usedMs: 0, remainingMs: ELEVEN_HOURS_MS },
      shiftState: { usedMs: 0, remainingMs: FOURTEEN_HOURS_MS },
      breakState: { usedMs: 0, remainingMs: EIGHT_HOURS_MS },
    };
  }

  const currentIndex = segments.length - 1;
  const currentCycle = cycleStates.at(-1);

  const driveState = calculateDrivingClock(segments, currentIndex);
  const shiftState = calculateShiftClock(segments, currentIndex);
  const breakState = calculateBreakClock(segments, currentIndex);

  return {
    cycleStates,
    currentCycle: currentCycle ?? { usedMs: 0, remainingMs: CYCLE_LIMIT_MS },
    driveState,
    shiftState,
    breakState,
  };
}

export function checkViolations(events: HosEvent[]) {
  const segments = buildSegments(events);

  const violations = [];
  let has14hViolation = false;
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];

    const prev = {
      drive: calculateDrivingClock(segments, i - 1),
      shift: calculateShiftClock(segments, i - 1),
      brake: calculateBreakClock(segments, i - 1),
    };

    const curr = {
      drive: calculateDrivingClock(segments, i),
      shift: calculateShiftClock(segments, i),
      brake: calculateBreakClock(segments, i),
    };

    if (prev.shift.usedMs > 0 && curr.shift.usedMs < prev.shift.usedMs) {
      has14hViolation = false;
    }

    if (
      !has14hViolation &&
      prev.shift.usedMs < FOURTEEN_HOURS_MS &&
      curr.shift.usedMs >= FOURTEEN_HOURS_MS &&
      isDriving(seg)
    ) {
      const msNeeded = FOURTEEN_HOURS_MS - prev.shift.usedMs;
      const violationTs = seg.startTs + msNeeded;
      violations.push({
        rule: "14h",
        message: `14h violation at ${fmt(violationTs)}`,
        startTs: violationTs,
        endTs: getResetEndTs(segments, i + 1),
      });
      has14hViolation = true;
    }

    if (
      !has14hViolation &&
      prev.shift.remainingMs <= 0 &&
      isOnDuty(seg) &&
      !isOnDuty(segments[i - 1])
    ) {
      violations.push({
        rule: "14h",
        message: `On duty after 14h window at ${fmt(seg.startTs)}`,
        startTs: seg.startTs,
        endTs: getResetEndTs(segments, i + 1),
      });
      has14hViolation = true;
    }
    // 11h
    if (
      prev.drive.usedMs < ELEVEN_HOURS_MS &&
      curr.drive.usedMs >= ELEVEN_HOURS_MS
    ) {
      const msNeeded = ELEVEN_HOURS_MS - prev.drive.usedMs;
      const violationTs = seg.startTs + msNeeded;
      violations.push({
        rule: "11h",
        message: `11h violation at ${fmt(violationTs)}`,
        startTs: violationTs,
        endTs: getResetEndTs(segments, i + 1),
      });
    }

    // 30min
    if (
      prev.brake.usedMs < EIGHT_HOURS_MS &&
      curr.brake.usedMs >= EIGHT_HOURS_MS
    ) {
      const msNeeded = EIGHT_HOURS_MS - prev.brake.usedMs;
      const violationTs = seg.startTs + msNeeded;
      violations.push({
        rule: "30min",
        message: `30min break violation at ${fmt(violationTs)}`,
        startTs: violationTs,
        endTs: getResetEndTs(segments, i + 1),
      });
    }
  }

  return violations.filter((v) => {
    if (v.rule !== "14h") return true;
    return v.endTs === null;
  });
}
