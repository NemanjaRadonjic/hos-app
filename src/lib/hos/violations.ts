// import { DateTime } from "luxon";
// import { buildSegments } from "./segments";
// import type { HosEvent } from "../types";
// import { isDriving, isOnDuty, isRest } from "./helpers";

// type DutyStatus = "DS_OFF" | "DS_SB" | "DS_D" | "DS_ON";

// interface Segment {
//   status: DutyStatus;
//   startTs: number;
//   endTs: number;
//   durationMs: number;
// }

// export interface Violation {
//   rule: "11h" | "14h" | "30min" | "70h";
//   message: string;

//   // when violation begins
//   startTs: number;

//   // when violation stops being active
//   endTs: number | null;
// }

// const MINUTE_MS = 60 * 1000;

// const ELEVEN_HOURS_MS = 11 * 60 * MINUTE_MS;
// const FOURTEEN_HOURS_MS = 14 * 60 * MINUTE_MS;
// const THIRTY_MINUTES_MS = 30 * MINUTE_MS;
// const TEN_HOURS_MS = 10 * 60 * MINUTE_MS;
// const EIGHT_HOURS_MS = 8 * 60 * MINUTE_MS;

// const fmt = (ts: number) =>
//   DateTime.fromMillis(ts).toFormat("MMM d, h:mm:ss a");

// function getResetEndTs(
//   segments: Segment[],
//   currentIndex: number,
// ): number | null {
//   let rest = 0;

//   for (let i = currentIndex; i < segments.length; i++) {
//     const seg = segments[i];

//     if (!isRest(seg)) {
//       rest = 0;
//       continue;
//     }

//     rest += seg.durationMs;

//     if (rest >= TEN_HOURS_MS) {
//       return seg.endTs;
//     }
//   }

//   return null;
// }

// function getResetStartTs(
//   segments: Segment[],
//   currentIndex: number,
// ): number | null {
//   let rest = 0;
//   let resetStart: number | null = null;

//   for (let i = currentIndex; i < segments.length; i++) {
//     const seg = segments[i];

//     if (!isRest(seg)) {
//       rest = 0;
//       resetStart = null;
//       continue;
//     }

//     if (resetStart === null) {
//       resetStart = seg.startTs;
//     }

//     rest += seg.durationMs;

//     if (rest >= TEN_HOURS_MS) {
//       return resetStart;
//     }
//   }

//   return null;
// }

// export function checkViolations(events: HosEvent[]) {
//   const segments = buildSegments(events);

//   return [
//     ...checkVio14(segments),
//     ...checkVio11(segments),
//     ...checkVio30(segments),
//   ];
// }

// function checkVio14(segments: Segment[]): Violation[] {
//   console.log({ segments });
//   const violations: Violation[] = [];

//   let dutyWindowStart: number | null = null;
//   let violationTriggered = false;

//   for (let i = 0; i < segments.length; i++) {
//     const seg = segments[i];

//     // reset after 10h break
//     if (i > 0) {
//       const prev = segments[i - 1];

//       if (isRest(prev) && prev.durationMs >= TEN_HOURS_MS) {
//         dutyWindowStart = null;
//         violationTriggered = false;
//       }
//     }

//     // start duty window
//     if (dutyWindowStart === null && isOnDuty(seg)) {
//       dutyWindowStart = seg.startTs;
//     }

//     if (dutyWindowStart === null) continue;

//     const windowEndTs = dutyWindowStart + FOURTEEN_HOURS_MS;

//     const isPastWindow = seg.endTs > windowEndTs;

//     if (isOnDuty(seg) && isPastWindow && !violationTriggered) {
//       const resetStartTs = getResetStartTs(segments, i + 1);

//       violations.push({
//         rule: "14h",
//         message: `14h violation at ${fmt(seg.startTs)}`,
//         startTs: seg.startTs,
//         endTs: resetStartTs,
//       });

//       violationTriggered = true;
//     }
//   }

//   return violations;
// }

// function checkVio11(segments: Segment[]): Violation[] {
//   const violations: Violation[] = [];

//   let drivingMinutes = 0;

//   for (let i = 0; i < segments.length; i++) {
//     const seg = segments[i];

//     // reset after 10h break
//     if (i > 0) {
//       const prev = segments[i - 1];

//       if (isRest(prev) && prev.durationMs >= TEN_HOURS_MS) {
//         drivingMinutes = 0;
//       }
//     }

//     if (!isDriving(seg)) continue;

//     const prevDriving = drivingMinutes;

//     drivingMinutes += seg.durationMs;

//     const crossesLimit =
//       prevDriving < ELEVEN_HOURS_MS && drivingMinutes >= ELEVEN_HOURS_MS;

//     if (crossesLimit) {
//       const violationTs = seg.startTs + (ELEVEN_HOURS_MS - prevDriving);

//       const resetStartTs = getResetStartTs(segments, i + 1);

//       violations.push({
//         rule: "11h",
//         message: `11h violation at ${fmt(violationTs)}`,
//         startTs: violationTs,
//         endTs: resetStartTs,
//       });
//     }
//   }

//   return violations;
// }

// function checkVio30(segments: Segment[]): Violation[] {
//   const violations: Violation[] = [];

//   let drivingSinceBreak = 0;
//   let breakMinutes = 0;
//   let violationTriggered = false;

//   for (let i = 0; i < segments.length; i++) {
//     const seg = segments[i];

//     const countsAsBreak = isRest(seg) || seg.status === "DS_ON";

//     // accumulate break
//     if (countsAsBreak) {
//       breakMinutes += seg.durationMs;
//     } else {
//       breakMinutes = 0;
//     }

//     // reset 8h drive clock
//     if (breakMinutes >= THIRTY_MINUTES_MS) {
//       drivingSinceBreak = 0;
//       violationTriggered = false;
//     }

//     if (!isDriving(seg)) continue;

//     const prevDriving = drivingSinceBreak;

//     drivingSinceBreak += seg.durationMs;

//     const crossesLimit =
//       prevDriving < EIGHT_HOURS_MS && drivingSinceBreak >= EIGHT_HOURS_MS;

//     if (crossesLimit && !violationTriggered) {
//       const violationTs = seg.startTs + (EIGHT_HOURS_MS - prevDriving);

//       const resetTs = segments.slice(i + 1).find((s) => {
//         let rest = 0;

//         if (!(isRest(s) || s.status === "DS_ON")) {
//           return false;
//         }

//         rest += s.durationMs;

//         return rest >= THIRTY_MINUTES_MS;
//       })?.endTs;

//       violations.push({
//         rule: "30min",
//         message: `30min break violation at ${fmt(violationTs)}`,
//         startTs: violationTs,
//         endTs: resetTs ?? null,
//       });

//       violationTriggered = true;
//     }
//   }

//   return violations;
// }
