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

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;
const TEN_HOURS_MS = 10 * 60 * 60 * 1000;

function getNextFullResetStartTs(rests: RestInfo[], afterTs: number) {
  return (
    rests.find((r) => r.isFullReset && r.startTs > afterTs)?.startTs ?? null
  );
}

const fmt = (ts: number) =>
  DateTime.fromMillis(ts).toFormat("MMM d, h:mm:ss a");

const h = (ms: number | null | undefined) =>
  ms == null ? "-" : `${(ms / 3600000).toFixed(2)}h`;

const f = (ts: number | null | undefined) => (ts == null ? "-" : fmt(ts));
function isCycleResetRest(seg: Segment) {
  return seg.status === "DS_OFF" || seg.status === "DS_SB";
}

function buildCycleStates(segments: Segment[]): CycleState[] {
  if (segments.length === 0) return [];

  const states: CycleState[] = [];

  let cycleStartTs: number | null = null;
  let usedMs = 0;
  let consecutiveRestMs = 0;
  let restBlockStartTs: number | null = null;
  let inRest = false;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isRest = isCycleResetRest(seg);

    if (isRest) {
      if (!inRest) {
        restBlockStartTs = seg.startTs;
        inRest = true;
      }
      consecutiveRestMs += seg.durationMs;

      if (consecutiveRestMs >= RESTART_34H_MS) {
        const cycleEndTs = restBlockStartTs!;

        if (usedMs > 0) {
          const daysSpan =
            cycleStartTs !== null
              ? DateTime.fromMillis(cycleEndTs, { zone: "America/Chicago" })
                  .startOf("day")
                  .diff(
                    DateTime.fromMillis(cycleStartTs, {
                      zone: "America/Chicago",
                    }).startOf("day"),
                    "days",
                  ).days
              : 999;

          const isRecap = daysSpan >= 8;

          let finalUsed = usedMs;
          if (isRecap && cycleStartTs !== null) {
            const cycleEndMidnight = DateTime.fromMillis(cycleEndTs, {
              zone: "America/Chicago",
            }).startOf("day");
            const windowStart = cycleEndMidnight.minus({ days: 7 }).toMillis();

            finalUsed = segments.reduce((acc, s) => {
              if (!isOnDuty(s)) return acc;
              if (s.endTs <= windowStart) return acc;
              if (s.startTs >= cycleEndTs) return acc;
              const from = Math.max(s.startTs, windowStart);
              const to = Math.min(s.endTs, cycleEndTs);
              return acc + (to - from);
            }, 0);
          }

          states.push({
            startTs:
              isRecap && cycleStartTs !== null
                ? DateTime.fromMillis(cycleEndTs, { zone: "America/Chicago" })
                    .startOf("day")
                    .minus({ days: 7 })
                    .toMillis()
                : (cycleStartTs ?? segments[0].startTs),
            endTs: cycleEndTs,
            usedMs: finalUsed,
            remainingMs: Math.max(0, CYCLE_LIMIT_MS - finalUsed),
            isRecap,
            complete: true,
          });
        }

        cycleStartTs = null;
        usedMs = 0;
        inRest = false;
        consecutiveRestMs = 0;
        restBlockStartTs = null;
      }
    } else {
      if (inRest) {
        inRest = false;
        consecutiveRestMs = 0;
        restBlockStartTs = null;
      }

      if (cycleStartTs === null && usedMs === 0) {
        cycleStartTs = seg.startTs;
      }

      if (isOnDuty(seg)) {
        usedMs += seg.durationMs;
      }
    }
  }

  const cycleEndTs = segments.at(-1)!.endTs;

  if (cycleStartTs === null && usedMs === 0) {
    states.push({
      startTs: cycleEndTs,
      endTs: cycleEndTs,
      usedMs: 0,
      remainingMs: CYCLE_LIMIT_MS,
      isRecap: false,
      complete: false,
    });
  } else {
    const daysSpan =
      cycleStartTs !== null
        ? DateTime.fromMillis(cycleEndTs, { zone: "America/Chicago" })
            .startOf("day")
            .diff(
              DateTime.fromMillis(cycleStartTs, {
                zone: "America/Chicago",
              }).startOf("day"),
              "days",
            ).days
        : DateTime.fromMillis(cycleEndTs, { zone: "America/Chicago" })
            .startOf("day")
            .diff(
              DateTime.fromMillis(segments[0].startTs, {
                zone: "America/Chicago",
              }).startOf("day"),
              "days",
            ).days;

    const isRecap = daysSpan >= 8;

    let finalUsed = usedMs;
    if (isRecap) {
      const cycleEndMidnight = DateTime.fromMillis(cycleEndTs, {
        zone: "America/Chicago",
      }).startOf("day");
      const windowStart = cycleEndMidnight.minus({ days: 7 }).toMillis();

      finalUsed = segments.reduce((acc, s) => {
        if (!isOnDuty(s)) return acc;
        if (s.endTs <= windowStart) return acc;
        const from = Math.max(s.startTs, windowStart);
        const to = Math.min(s.endTs, cycleEndTs);
        return acc + (to - from);
      }, 0);
    }

    states.push({
      startTs: isRecap
        ? DateTime.fromMillis(cycleEndTs, { zone: "America/Chicago" })
            .startOf("day")
            .minus({ days: 7 })
            .toMillis()
        : (cycleStartTs ?? segments[0].startTs),
      endTs: cycleEndTs,
      usedMs: finalUsed,
      remainingMs: Math.max(0, CYCLE_LIMIT_MS - finalUsed),
      isRecap,
      complete: false,
    });
  }

  return states;
}

function sumOnDutyInWindow(
  segments: Segment[],
  windowStartTs: number,
  windowEndTs: number,
): number {
  let used = 0;
  for (const seg of segments) {
    if (seg.endTs <= windowStartTs) continue;
    if (seg.startTs >= windowEndTs) break;
    if (!isOnDuty(seg)) continue;

    const from = Math.max(seg.startTs, windowStartTs);
    const to = Math.min(seg.endTs, windowEndTs);
    used += to - from;
  }
  return used;
}

function checkCycleViolations(cycleStates: CycleState[], segments: Segment[]) {
  const violations = [];

  for (const cycle of cycleStates) {
    if (!cycle.isRecap) {
      if (cycle.usedMs > CYCLE_LIMIT_MS) {
        let accumulated = 0;
        let violationTs = cycle.startTs;

        for (const seg of segments) {
          if (!isOnDuty(seg)) continue;
          if (seg.startTs < cycle.startTs) continue;
          if (seg.startTs >= cycle.endTs) break;

          const prev = accumulated;
          accumulated += seg.durationMs;

          if (prev < CYCLE_LIMIT_MS && accumulated >= CYCLE_LIMIT_MS) {
            const msNeeded = CYCLE_LIMIT_MS - prev;
            violationTs = seg.startTs + msNeeded;
            break;
          }
        }

        violations.push({
          rule: "70h",
          startTs: violationTs,
          endTs: cycle.complete ? cycle.endTs : null,
        });
      }
    } else {
      const startDay = DateTime.fromMillis(cycle.startTs, {
        zone: "America/Chicago",
      }).startOf("day");
      const endDay = DateTime.fromMillis(cycle.endTs, {
        zone: "America/Chicago",
      }).startOf("day");
      const totalDays = endDay.diff(startDay, "days").days;

      for (let d = 0; d <= totalDays - 7; d++) {
        const windowStart = startDay.plus({ days: d }).toMillis();

        const windowEnd = startDay.plus({ days: d + 8 }).toMillis();

        const usedMs = sumOnDutyInWindow(segments, windowStart, windowEnd);
        if (usedMs > CYCLE_LIMIT_MS) {
          let accumulated = 0;
          let violationTs = windowStart;

          for (const seg of segments) {
            if (!isOnDuty(seg)) continue;
            if (seg.endTs <= windowStart) continue;
            if (seg.startTs >= windowEnd) break;

            const from = Math.max(seg.startTs, windowStart);
            const to = Math.min(seg.endTs, windowEnd);
            const prev = accumulated;
            accumulated += to - from;

            if (prev < CYCLE_LIMIT_MS && accumulated >= CYCLE_LIMIT_MS) {
              const msNeeded = CYCLE_LIMIT_MS - prev;
              violationTs = from + msNeeded;
              break;
            }
          }

          violations.push({
            rule: "70h",
            startTs: violationTs,
            endTs: cycle.complete ? cycle.endTs : null,
          });
          break;
        }
      }
    }
  }

  return violations;
}

export type Violation = {
  rule: "70h" | "14h" | "11h" | "30min";
  startTs: number;
  endTs: number | null;
  anchorTs?: number;
};

type RestCandidate = {
  startTs: number;
  endTs: number;
  durationMs: number;
};

type ClockState = {
  clockWindow: ClockWindow | null;
  hadReset: boolean;
  driveMs30: number;
  breakMs: number;
  violations: Violation[];
};

type RestInfo = {
  startIndex: number;
  endIndex: number;
  startTs: number;
  endTs: number;
  durationMs: number;

  isFullReset: boolean;
  isBig: boolean;
  isSmall: boolean;

  excludedFrom14h: boolean;
  anchorAfterThisRestTs: number | null;
};

const isSleeper = (segment: Segment) => segment.status === "DS_SB";

function initialClockState(): ClockState {
  return {
    clockWindow: null,
    hadReset: false,
    driveMs30: 0,
    breakMs: 0,
    violations: [],
  };
}

function getExcludedMs(
  anchorTs: number,
  nowTs: number,
  excludedRests: RestCandidate[],
) {
  return excludedRests.reduce((total, rest) => {
    const from = Math.max(anchorTs, rest.startTs);
    const to = Math.min(nowTs, rest.endTs);
    return total + Math.max(0, to - from);
  }, 0);
}

function sumDrivingSince(segments: Segment[], fromTs: number, toTs: number) {
  let total = 0;

  for (const seg of segments) {
    if (seg.endTs <= fromTs) continue;
    if (seg.startTs >= toTs) break;
    if (!isDriving(seg)) continue;

    const from = Math.max(seg.startTs, fromTs);
    const to = Math.min(seg.endTs, toTs);

    total += to - from;
  }

  return total;
}

function hasViolation(
  violations: Violation[],
  rule: Violation["rule"],
  anchorTs?: number,
) {
  return violations.some((v) => v.rule === rule && v.anchorTs === anchorTs);
}

function findAllRests(segments: Segment[]): RestInfo[] {
  const rests: RestInfo[] = [];

  let startIndex: number | null = null;
  let durationMs = 0;
  let sleeperMs = 0;
  let longestSleeperMs = 0;

  const reset = () => {
    startIndex = null;
    durationMs = 0;
    sleeperMs = 0;
    longestSleeperMs = 0;
  };

  const finishRest = (endIndex: number) => {
    if (startIndex === null) return;

    const startSeg = segments[startIndex];
    const endSeg = segments[endIndex];

    const isFullReset = durationMs >= TEN_HOURS_MS;
    const isBig = longestSleeperMs >= SEVEN_HOURS_MS;
    const isSmall = durationMs >= TWO_HOURS_MS;

    if (!isFullReset && !isBig && !isSmall) {
      reset();
      return;
    }

    rests.push({
      startIndex,
      endIndex,
      startTs: startSeg.startTs,
      endTs: endSeg.endTs,
      durationMs,

      isFullReset,
      isBig,
      isSmall,

      excludedFrom14h: false,
      anchorAfterThisRestTs: null,
    });

    reset();
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    if (isRest(seg)) {
      if (startIndex === null) startIndex = i;

      durationMs += seg.durationMs;

      if (isSleeper(seg)) {
        sleeperMs += seg.durationMs;
        longestSleeperMs = Math.max(longestSleeperMs, sleeperMs);
      } else {
        sleeperMs = 0;
      }

      continue;
    }

    finishRest(i - 1);
  }

  finishRest(segments.length - 1);

  return rests;
}

function isValidSplitPair(first: RestInfo, second: RestInfo) {
  return (
    first.isSmall &&
    second.isSmall &&
    first.durationMs + second.durationMs >= TEN_HOURS_MS &&
    (first.isBig || second.isBig)
  );
}

function findPreviousSplitPairIndex(rests: RestInfo[], currentIndex: number) {
  const current = rests[currentIndex];

  for (let i = currentIndex - 1; i >= 0; i--) {
    const prev = rests[i];

    if (prev.isFullReset) break;

    if (isValidSplitPair(prev, current)) {
      return i;
    }
  }

  return null;
}

function annotateSplitPairs(rests: RestInfo[]): RestInfo[] {
  const next = rests.map((r) => ({ ...r }));

  for (let i = 0; i < next.length; i++) {
    const current = next[i];

    const pairIndex = findPreviousSplitPairIndex(next, i);

    if (pairIndex !== null) {
      const previous = next[pairIndex];

      previous.excludedFrom14h = true;
      current.excludedFrom14h = true;

      if (!current.isFullReset) {
        current.anchorAfterThisRestTs = previous.endTs;
      }

      continue;
    }

    if (current.isFullReset) {
      continue;
    }

    if (current.isBig) {
      current.excludedFrom14h = true;
    }
  }

  return next;
}

type ClockWindow = {
  anchorTs: number;
  excludedRests: RestCandidate[];
};

function processSegment(
  state: ClockState,
  seg: Segment,
  segments: Segment[],
  rests: RestInfo[],
  index: number,
): ClockState {
  const restByStartIndex = new Map(rests.map((r) => [r.startIndex, r]));
  const restInfo = restByStartIndex.get(index);
  const nextRestStartTs = getNextFullResetStartTs(rests, seg.startTs);
  let { clockWindow, hadReset, driveMs30, breakMs, violations } = state;

  if (restInfo) {
    const restCandidate: RestCandidate = {
      startTs: restInfo.startTs,
      endTs: restInfo.endTs,
      durationMs: restInfo.durationMs,
    };

    if (restInfo.anchorAfterThisRestTs) {
      clockWindow = {
        anchorTs: restInfo.anchorAfterThisRestTs,
        excludedRests: [...(clockWindow?.excludedRests ?? []), restCandidate],
      };
    } else if (restInfo.excludedFrom14h && clockWindow) {
      clockWindow = {
        ...clockWindow,
        excludedRests: [...clockWindow.excludedRests, restCandidate],
      };
    }

    if (restInfo.isFullReset) {
      clockWindow = null;
      hadReset = true;
      driveMs30 = 0;
      breakMs = 0;
    }
  }

  if (!isRest(seg)) {
    if (hadReset) {
      clockWindow = {
        anchorTs: seg.startTs,
        excludedRests: [],
      };
      hadReset = false;
    }

    if (clockWindow === null && isOnDuty(seg)) {
      clockWindow = {
        anchorTs: seg.startTs,
        excludedRests: [],
      };
    }
  }

  if (isRest(seg) || seg.status === "DS_ON") {
    breakMs += seg.durationMs;

    if (breakMs >= THIRTY_MIN_MS) {
      driveMs30 = 0;
    }
  } else if (isDriving(seg)) {
    breakMs = 0;
    driveMs30 += seg.durationMs;
  }

  if (clockWindow && isDriving(seg)) {
    const excludedAtStart = getExcludedMs(
      clockWindow.anchorTs,
      seg.startTs,
      clockWindow.excludedRests,
    );

    const excludedAtEnd = getExcludedMs(
      clockWindow.anchorTs,
      seg.endTs,
      clockWindow.excludedRests,
    );

    const shiftUsedAtStart =
      seg.startTs - clockWindow.anchorTs - excludedAtStart;

    const shiftUsedAtEnd = seg.endTs - clockWindow.anchorTs - excludedAtEnd;

    if (!hasViolation(violations, "14h", clockWindow.anchorTs)) {
      if (shiftUsedAtStart >= FOURTEEN_HOURS_MS) {
        violations = [
          ...violations,
          {
            rule: "14h",
            startTs: seg.startTs,
            endTs: nextRestStartTs,
            anchorTs: clockWindow.anchorTs,
          },
        ];
      } else if (shiftUsedAtEnd >= FOURTEEN_HOURS_MS) {
        violations = [
          ...violations,
          {
            rule: "14h",
            startTs: seg.startTs + (FOURTEEN_HOURS_MS - shiftUsedAtStart),
            endTs: nextRestStartTs,
            anchorTs: clockWindow.anchorTs,
          },
        ];
      }
    }
  }

  if (clockWindow && isDriving(seg)) {
    const prevDriveMs = sumDrivingSince(
      segments,
      clockWindow.anchorTs,
      seg.startTs,
    );

    const nextDriveMs = prevDriveMs + seg.durationMs;

    if (
      prevDriveMs < ELEVEN_HOURS_MS &&
      nextDriveMs >= ELEVEN_HOURS_MS &&
      !hasViolation(violations, "11h", clockWindow.anchorTs)
    ) {
      violations = [
        ...violations,
        {
          rule: "11h",
          startTs: seg.startTs + (ELEVEN_HOURS_MS - prevDriveMs),
          endTs: nextRestStartTs,
          anchorTs: clockWindow.anchorTs,
        },
      ];
    }
  }

  if (isDriving(seg)) {
    const prevDriveMs30 = driveMs30 - seg.durationMs;

    if (prevDriveMs30 < EIGHT_HOURS_MS && driveMs30 >= EIGHT_HOURS_MS) {
      violations = [
        ...violations,
        {
          rule: "30min",
          startTs: seg.startTs + (EIGHT_HOURS_MS - prevDriveMs30),
          endTs: nextRestStartTs,
        },
      ];
    }
  }

  return {
    clockWindow,
    hadReset,
    driveMs30,
    breakMs,
    violations,
  };
}

export function runEngine(segments: Segment[], rests: RestInfo[]) {
  let state = initialClockState();

  for (let i = 0; i < segments.length; i++) {
    state = processSegment(state, segments[i], segments, rests, i);
    // const excludedMs = state.clockWindow
    //   ? getExcludedMs(
    //       state.clockWindow.anchorTs,
    //       segments[i].endTs,
    //       state.clockWindow.excludedRests,
    //     )
    //   : 0;

    // const shiftUsedMs = state.clockWindow
    //   ? segments[i].endTs - state.clockWindow.anchorTs - excludedMs
    //   : 0;

    // const driveUsedMs = state.clockWindow
    //   ? sumDrivingSince(segments, state.clockWindow.anchorTs, segments[i].endTs)
    //   : 0;

    // console.table([
    //   {
    //     i,
    //     status: segments[i].status,
    //     shiftUsed: h(shiftUsedMs),
    //     driveUsed: h(driveUsedMs),
    //     excluded: h(excludedMs),
    //     anchor: state.clockWindow ? fmt(state.clockWindow.anchorTs) : "-",
    //   },
    // ]);
  }

  const lastSeg = segments.at(-1);

  const shiftUsedMs =
    lastSeg && state.clockWindow
      ? Math.max(
          0,
          lastSeg.endTs -
            state.clockWindow.anchorTs -
            getExcludedMs(
              state.clockWindow.anchorTs,
              lastSeg.endTs,
              state.clockWindow.excludedRests,
            ),
        )
      : 0;

  const driveUsedMs =
    lastSeg && state.clockWindow
      ? sumDrivingSince(segments, state.clockWindow.anchorTs, lastSeg.endTs)
      : 0;

  return {
    shiftState: {
      usedMs: shiftUsedMs,
      remainingMs: Math.max(0, FOURTEEN_HOURS_MS - shiftUsedMs),
    },
    driveState: {
      usedMs: driveUsedMs,
      remainingMs: Math.max(0, ELEVEN_HOURS_MS - driveUsedMs),
    },
    breakState: {
      usedMs: state.driveMs30,
      remainingMs: Math.max(0, EIGHT_HOURS_MS - state.driveMs30),
    },
    violations: state.violations,
  };
}

export function hosEngine(events: HosEvent[]) {
  const segments = buildSegments(events);
  const rests = annotateSplitPairs(findAllRests(segments));
  // console.table(
  //   rests.map((r, i) => ({
  //     i,
  //     hours: (r.durationMs / 3600000).toFixed(2),
  //     big: r.isBig,
  //     small: r.isSmall,
  //     excluded: r.excludedFrom14h,
  //     anchorAfter: r.anchorAfterThisRestTs ? fmt(r.anchorAfterThisRestTs) : "-",
  //   })),
  // );
  //   console.table(
  //     rests.map((r, i) => ({
  //       i,
  //       startIndex: r.startIndex,
  //       endIndex: r.endIndex,
  //       start: fmt(r.startTs),
  //       end: fmt(r.endTs),
  //       hours: (r.durationMs / 3600000).toFixed(2),
  //       reset: r.isFullReset,
  //       big: r.isBig,
  //       small: r.isSmall,
  //       excluded: r.excludedFrom14h,
  //       anchorAfter: r.anchorAfterThisRestTs ? fmt(r.anchorAfterThisRestTs) : "-",
  //     })),
  //   );
  const cycleStates = buildCycleStates(segments);
  const { violations, ...result } = runEngine(segments, rests);
  const cycleViolations = checkCycleViolations(cycleStates, segments);

  return {
    clocks: {
      ...result,
      currentCycle: cycleStates.at(-1),
      cycleStates: cycleStates.filter((c) => !(c.startTs === c.endTs)),
    },
    violations: [...violations, ...cycleViolations],
  };
}
