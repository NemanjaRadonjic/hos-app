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

const fmt = (ts: number) =>
  DateTime.fromMillis(ts).toFormat("MMM d, h:mm:ss a");

function getResetEndTs(segments: Segment[], fromIndex: number): number | null {
  let pendingBig: { index: number; durationMs: number } | null = null;
  let pendingSmall: { index: number; durationMs: number } | null = null;
  let consecutiveRestMs = 0;

  for (let i = fromIndex; i < segments.length; i++) {
    const seg = segments[i];

    if (seg.status === "DS_SB" || seg.status === "DS_OFF") {
      consecutiveRestMs += seg.durationMs;
      if (consecutiveRestMs >= TEN_HOURS_MS) return seg.endTs;
    } else {
      consecutiveRestMs = 0;
    }

    const isBig =
      seg.status === "DS_SB" &&
      seg.durationMs >= 7 * 60 * 60 * 1000 &&
      seg.durationMs < TEN_HOURS_MS;

    const isSmall =
      (seg.status === "DS_SB" || seg.status === "DS_OFF") &&
      seg.durationMs >= 2 * 60 * 60 * 1000 &&
      seg.durationMs < 7 * 60 * 60 * 1000;

    if (isBig) {
      if (pendingSmall !== null) {
        const minSmall =
          seg.durationMs < 8 * 60 * 60 * 1000
            ? 3 * 60 * 60 * 1000
            : 2 * 60 * 60 * 1000;
        if (pendingSmall.durationMs >= minSmall) return seg.endTs;
        else {
          pendingBig = { index: i, durationMs: seg.durationMs };
          pendingSmall = null;
        }
      } else {
        pendingBig = { index: i, durationMs: seg.durationMs };
      }
      continue;
    }

    if (isSmall) {
      if (pendingBig !== null) {
        const minSmall =
          pendingBig.durationMs < 8 * 60 * 60 * 1000
            ? 3 * 60 * 60 * 1000
            : 2 * 60 * 60 * 1000;
        if (seg.durationMs >= minSmall) return seg.endTs;
        else {
          pendingSmall = { index: i, durationMs: seg.durationMs };
          pendingBig = null;
        }
      } else {
        pendingSmall = { index: i, durationMs: seg.durationMs };
      }
      continue;
    }
  }

  return null;
}

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

function isValidSplit(
  big: { durationMs: number; endTs: number },
  small: { durationMs: number; endTs: number },
) {
  const bigOk = big.durationMs >= 7 * 60 * 60 * 1000;

  const smallOk = small.durationMs >= 2 * 60 * 60 * 1000;

  return bigOk && smallOk && big.durationMs + small.durationMs >= TEN_HOURS_MS;
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

type ClockWindow = {
  anchorTs: number;
  excludedRest: RestCandidate | null;
};

type EngineState = {
  clockWindow: ClockWindow | null;

  pendingBig: RestCandidate | null;
  pendingSmall: RestCandidate | null;

  driveMs30: number;
  breakMs: number;

  consecutiveRestMs: number;
  hadReset: boolean;

  last14ViolationAnchorTs: number | null;

  violations: Violation[];
};

function initialState(): EngineState {
  return {
    clockWindow: null,

    pendingBig: null,
    pendingSmall: null,

    driveMs30: 0,
    breakMs: 0,

    consecutiveRestMs: 0,
    hadReset: false,

    last14ViolationAnchorTs: null,

    violations: [],
  };
}

function getFullResetStartTs(
  segments: Segment[],
  fromIndex: number,
): number | null {
  let consecutiveRestMs = 0;
  let restBlockStartTs: number | null = null;

  for (let i = fromIndex; i < segments.length; i++) {
    const seg = segments[i];
    const isRest = seg.status === "DS_SB" || seg.status === "DS_OFF";

    if (isRest) {
      if (restBlockStartTs === null) {
        restBlockStartTs = seg.startTs;
      }

      consecutiveRestMs += seg.durationMs;

      if (consecutiveRestMs >= TEN_HOURS_MS) {
        return restBlockStartTs;
      }
    } else {
      consecutiveRestMs = 0;
      restBlockStartTs = null;
    }
  }

  return null;
}

function getExcludedMs(
  anchorTs: number,
  nowTs: number,
  excludedRest: RestCandidate | null,
) {
  if (!excludedRest) return 0;

  const from = Math.max(anchorTs, excludedRest.startTs);
  const to = Math.min(nowTs, excludedRest.endTs);

  return Math.max(0, to - from);
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

function removeClockViolationsForAnchor(
  violations: Violation[],
  anchorTs: number | null,
) {
  if (anchorTs === null) return violations;

  return violations.filter((v) => {
    if (v.rule !== "11h" && v.rule !== "14h") return true;
    return v.anchorTs !== anchorTs;
  });
}

function checkClockWindowViolations({
  segments,
  fromTs,
  toTs,
  anchorTs,
  excludedRest,
  endTs,
}: {
  segments: Segment[];
  fromTs: number;
  toTs: number;
  anchorTs: number;
  excludedRest: RestCandidate | null;
  endTs: number | null;
}): Violation[] {
  const violations: Violation[] = [];

  let driveMs = 0;
  let has11 = false;
  let has14 = false;

  for (const seg of segments) {
    if (seg.endTs <= fromTs) continue;
    if (seg.startTs >= toTs) break;

    const from = Math.max(seg.startTs, fromTs);
    const to = Math.min(seg.endTs, toTs);
    const durationMs = to - from;

    if (durationMs <= 0) continue;

    if (isOnDuty(seg) && !has14) {
      const excludedMs = getExcludedMs(anchorTs, to, excludedRest);
      const shiftUsedMs = to - anchorTs - excludedMs;

      if (shiftUsedMs >= FOURTEEN_HOURS_MS) {
        violations.push({
          rule: "14h",
          startTs: anchorTs + excludedMs + FOURTEEN_HOURS_MS,
          endTs,
          anchorTs,
        });

        has14 = true;
      }
    }

    if (isDriving(seg) && !has11) {
      const prevDriveMs = driveMs;
      driveMs += durationMs;

      if (prevDriveMs < ELEVEN_HOURS_MS && driveMs >= ELEVEN_HOURS_MS) {
        violations.push({
          rule: "11h",
          startTs: from + (ELEVEN_HOURS_MS - prevDriveMs),
          endTs,
          anchorTs,
        });

        has11 = true;
      }
    }
  }

  return violations;
}

// TODO: differently typed, chained split recalculation
// The engine currently doesnt support type 7 > 4 > 2 > 8+
// TODO: apparently pairs of 7 into small split also doesnt exclude the small ?

function completeSplitPair({
  violations,
  segments,
  oldAnchorTs,
  firstRest,
  secondRest,
}: {
  violations: Violation[];
  segments: Segment[];
  oldAnchorTs: number | null;
  firstRest: RestCandidate;
  secondRest: RestCandidate;
}) {
  let nextViolations = removeClockViolationsForAnchor(violations, oldAnchorTs);

  if (oldAnchorTs === null) return nextViolations;
  const resolvedTs = getFullResetStartTs(
    segments,
    segments.findIndex((s) => s.startTs === secondRest.startTs) + 1,
  );

  const oldWindow = checkClockWindowViolations({
    segments,
    fromTs: oldAnchorTs,
    toTs: secondRest.startTs,
    anchorTs: oldAnchorTs,
    excludedRest: firstRest,
    endTs: resolvedTs,
  });

  const splitWindow = checkClockWindowViolations({
    segments,
    fromTs: firstRest.endTs,
    toTs: secondRest.startTs,
    anchorTs: firstRest.endTs,
    excludedRest: null,
    endTs: resolvedTs,
  });

  return [...nextViolations, ...oldWindow, ...splitWindow];
}

function processSegment(
  state: EngineState,
  seg: Segment,
  segments: Segment[],
  segIndex: number,
): EngineState {
  let {
    clockWindow,
    pendingBig,
    pendingSmall,
    driveMs30,
    breakMs,
    consecutiveRestMs,
    hadReset,
    last14ViolationAnchorTs,
    violations,
  } = state;

  const isRest = seg.status === "DS_SB" || seg.status === "DS_OFF";

  const isSplitBig =
    seg.status === "DS_SB" && seg.durationMs >= 7 * 60 * 60 * 1000;

  const isSplitSmall =
    isRest &&
    seg.durationMs >= 2 * 60 * 60 * 1000 &&
    seg.durationMs < 7 * 60 * 60 * 1000;

  const currentRest = {
    startTs: seg.startTs,
    endTs: seg.endTs,
    durationMs: seg.durationMs,
  };

  // LOGGING
  // const f = (ts: number | null | undefined) =>
  //   ts ? DateTime.fromMillis(ts).toFormat("MM/dd HH:mm:ss") : null;

  // const h = (ms: number | null | undefined) =>
  //   ms == null
  //     ? null
  //     : `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;

  // const driveUsed =
  //   clockWindow !== null
  //     ? sumDrivingSince(segments, clockWindow.anchorTs, seg.endTs)
  //     : 0;

  // const excludedUsed =
  //   clockWindow !== null
  //     ? getExcludedMs(clockWindow.anchorTs, seg.endTs, clockWindow.excludedRest)
  //     : 0;

  // const shiftUsed =
  //   clockWindow !== null ? seg.endTs - clockWindow.anchorTs - excludedUsed : 0;

  // console.table({
  //   i: segIndex,
  //   status: seg.status,
  //   start: f(seg.startTs),
  //   end: f(seg.endTs),
  //   dur: h(seg.durationMs),

  //   isRest,
  //   isSplitBig,
  //   isSplitSmall,

  //   anchor: f(clockWindow?.anchorTs),
  //   excludedRestStart: f(clockWindow?.excludedRest?.startTs),
  //   excludedRestEnd: f(clockWindow?.excludedRest?.endTs),
  //   excludedUsed: h(excludedUsed),

  //   pendingBigEnd: f(pendingBig?.endTs),
  //   pendingBigDur: h(pendingBig?.durationMs),
  //   pendingSmallEnd: f(pendingSmall?.endTs),
  //   pendingSmallDur: h(pendingSmall?.durationMs),

  //   shiftUsed: h(shiftUsed),
  //   shiftRemaining: h(FOURTEEN_HOURS_MS - shiftUsed),

  //   driveUsed: h(driveUsed),
  //   driveRemaining: h(ELEVEN_HOURS_MS - driveUsed),

  //   driveMs30: h(driveMs30),
  //   breakMs: h(breakMs),

  //   consecutiveRestMs: h(consecutiveRestMs),
  //   hadReset,

  //   violations: violations.map((v) => ({
  //     rule: v.rule,
  //     start: f(v.startTs),
  //     end: f(v.endTs),
  //   })),
  // });

  if (isSplitBig) {
    if (pendingSmall !== null && isValidSplit(currentRest, pendingSmall)) {
      const oldAnchorTs = clockWindow?.anchorTs ?? null;

      violations = completeSplitPair({
        violations,
        segments,
        oldAnchorTs,
        firstRest: pendingSmall,
        secondRest: currentRest,
      });

      clockWindow = {
        anchorTs: pendingSmall.endTs,
        excludedRest: currentRest,
      };

      pendingSmall = null;
      pendingBig = currentRest;
      last14ViolationAnchorTs = null;
    } else if (pendingBig !== null) {
      const oldAnchorTs = clockWindow?.anchorTs ?? null;

      violations = completeSplitPair({
        violations,
        segments,
        oldAnchorTs,
        firstRest: pendingBig,
        secondRest: currentRest,
      });

      clockWindow = {
        anchorTs: pendingBig.endTs,
        excludedRest: currentRest,
      };

      pendingBig = currentRest;
      last14ViolationAnchorTs = null;
    } else {
      pendingBig = currentRest;

      if (clockWindow !== null) {
        clockWindow = {
          ...clockWindow,
          excludedRest: currentRest,
        };
      }
    }
  }

  if (isSplitSmall) {
    // console.log("SPLIT: small detected", {
    //   start: f(currentRest.startTs),
    //   end: f(currentRest.endTs),
    //   dur: h(currentRest.durationMs),
    //   pendingBig,
    // });
    if (pendingBig !== null && isValidSplit(pendingBig, currentRest)) {
      // console.log("SPLIT: valid pair, big first / small second", {
      //   newAnchor: f(pendingBig.endTs),
      //   excludedRest: null,
      // });
      const oldAnchorTs = clockWindow?.anchorTs ?? null;

      violations = completeSplitPair({
        violations,
        segments,
        oldAnchorTs,
        firstRest: pendingBig,
        secondRest: currentRest,
      });

      clockWindow = {
        anchorTs: pendingBig.endTs,
        excludedRest: currentRest,
      };

      pendingBig = null;
      pendingSmall = currentRest;
      last14ViolationAnchorTs = null;
    } else {
      pendingSmall = currentRest;
    }
  }

  if (isRest) {
    consecutiveRestMs += seg.durationMs;

    if (consecutiveRestMs >= TEN_HOURS_MS) {
      hadReset = true;

      clockWindow = null;
      pendingBig = null;
      pendingSmall = null;

      driveMs30 = 0;
      breakMs = 0;

      last14ViolationAnchorTs = null;
    }
  } else {
    consecutiveRestMs = 0;

    if (hadReset) {
      clockWindow = {
        anchorTs: seg.startTs,
        excludedRest: null,
      };

      hadReset = false;
      last14ViolationAnchorTs = null;
    }

    if (clockWindow === null && isOnDuty(seg)) {
      clockWindow = {
        anchorTs: seg.startTs,
        excludedRest: null,
      };
    }
  }

  if (isRest || seg.status === "DS_ON") {
    breakMs += seg.durationMs;

    if (breakMs >= THIRTY_MIN_MS) {
      driveMs30 = 0;
    }
  } else if (isDriving(seg)) {
    breakMs = 0;
    driveMs30 += seg.durationMs;
  }

  if (clockWindow !== null && isOnDuty(seg)) {
    const prevExcludedMs = getExcludedMs(
      clockWindow.anchorTs,
      seg.startTs,
      clockWindow.excludedRest,
    );

    const prevShiftUsedMs = seg.startTs - clockWindow.anchorTs - prevExcludedMs;

    const excludedMs = getExcludedMs(
      clockWindow.anchorTs,
      seg.endTs,
      clockWindow.excludedRest,
    );

    const shiftUsedMs = seg.endTs - clockWindow.anchorTs - excludedMs;

    if (
      prevShiftUsedMs < FOURTEEN_HOURS_MS &&
      shiftUsedMs >= FOURTEEN_HOURS_MS &&
      last14ViolationAnchorTs !== clockWindow.anchorTs
    ) {
      const msNeeded = FOURTEEN_HOURS_MS - prevShiftUsedMs;

      violations = [
        ...violations,
        {
          rule: "14h",
          startTs: seg.startTs + msNeeded,
          endTs: getFullResetStartTs(segments, segIndex + 1),
          anchorTs: clockWindow.anchorTs,
        },
      ];

      last14ViolationAnchorTs = clockWindow.anchorTs;
    }
  }

  if (clockWindow !== null && isDriving(seg)) {
    const driveMs = sumDrivingSince(segments, clockWindow.anchorTs, seg.endTs);

    if (driveMs >= ELEVEN_HOURS_MS) {
      const prevDriveMs = sumDrivingSince(
        segments,
        clockWindow.anchorTs,
        seg.startTs,
      );

      if (prevDriveMs < ELEVEN_HOURS_MS) {
        const msNeeded = ELEVEN_HOURS_MS - prevDriveMs;

        violations = [
          ...violations,
          {
            rule: "11h",
            startTs: seg.startTs + msNeeded,
            endTs: getFullResetStartTs(segments, segIndex + 1),
            anchorTs: clockWindow.anchorTs,
          },
        ];
      }
    }
  }

  if (isDriving(seg) && driveMs30 >= EIGHT_HOURS_MS) {
    const prevDriveMs30 = driveMs30 - seg.durationMs;

    if (prevDriveMs30 < EIGHT_HOURS_MS) {
      const msNeeded = EIGHT_HOURS_MS - prevDriveMs30;

      violations = [
        ...violations,
        {
          rule: "30min",
          startTs: seg.startTs + msNeeded,
          endTs: getFullResetStartTs(segments, segIndex + 1),
        },
      ];
    }
  }

  return {
    clockWindow,
    pendingBig,
    pendingSmall,
    driveMs30,
    breakMs,
    consecutiveRestMs,
    hadReset,
    last14ViolationAnchorTs,
    violations,
  };
}

export function runEngine(events: HosEvent[]) {
  const segments = buildSegments(events);

  if (segments.length === 0) {
    return {
      shiftState: { usedMs: 0, remainingMs: FOURTEEN_HOURS_MS },
      driveState: { usedMs: 0, remainingMs: ELEVEN_HOURS_MS },
      breakState: { usedMs: 0, remainingMs: EIGHT_HOURS_MS },
      violations: [],
    };
  }

  let state = initialState();
  for (let i = 0; i < segments.length; i++) {
    state = processSegment(state, segments[i], segments, i);
  }

  const lastSeg = segments.at(-1)!;

  const shiftUsedMs =
    state.clockWindow !== null
      ? Math.max(
          0,
          lastSeg.endTs -
            state.clockWindow.anchorTs -
            getExcludedMs(
              state.clockWindow.anchorTs,
              lastSeg.endTs,
              state.clockWindow.excludedRest,
            ),
        )
      : 0;

  const driveUsedMs =
    state.clockWindow !== null
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

  const cycleStates = buildCycleStates(segments);
  const { violations, ...result } = runEngine(events);
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
