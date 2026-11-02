import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { fetchCertificationData } from "./fetchCertificationData";
import { useDriversData } from "@/lib/hooks/useDriversData";
import { DateTime } from "luxon";
import { buildLogCheck } from "@/lib/log-check";
import type { HosEvent } from "@/lib/types";
import {
  deleteHosEvent,
  upsertDailyLog,
  upsertDailyLogSummary,
  upsertHosEvent,
} from "@/lib/api";
import { generateHosEventId } from "@/lib/hos/helpers";
import { findCertAnchorEvent } from "@/lib/hooks/helpers/find-cert-anchor";
import { mainEventCodes } from "@/lib/maps";

type LogDayCheck = ReturnType<typeof buildLogCheck>["byDate"][string];

export const Route = createFileRoute("/certifications/")({
  component: RouteComponent,
});

type DriverResult = {
  status: "waiting" | "loading" | "loaded" | "error";
  data?: Awaited<ReturnType<typeof fetchCertificationData>>;
  diagnostics?: ReturnType<typeof buildLogCheck>;
  error?: string;
};

type DriverIssue =
  | "Missing DLS"
  | "Driving"
  | "No signature"
  | "No daily log"
  | "No DLS summary";

type DriverCheck = {
  certStatus: string;
  isActive: boolean;
  issues: DriverIssue[];
  dailyLog:
    | NonNullable<DriverResult["data"]>["dailyLogsData"][number]
    | undefined;
  dailySummary:
    | NonNullable<DriverResult["data"]>["dailySummariesData"][number]
    | undefined;
  signature: string | undefined;
  anchorEvent: HosEvent | undefined;
  day: LogDayCheck | undefined;
};

type FixResult = { status: "fixed" } | { status: "skipped"; reason: string };

type Progress = {
  total: number;
  completed: number;
  currentDriverId?: string;
};

function hasActivity(events: HosEvent[]) {
  return events.some(
    (event) => event.eventCode.id === "DS_D" || event.eventCode.id === "DS_ON",
  );
}

function getCertStatus(day: LogDayCheck | undefined, isActive: boolean) {
  if (!isActive) return "Inactive";
  if (!day) return "No data";
  if (!day.derived.isCertified) return "Missing";

  const hasCertErrors = day.issues.some(
    (issue) => issue.group === "Certification" && issue.severity === "error",
  );

  return hasCertErrors ? "Invalid" : "Valid";
}

function getDriverCheck(result: DriverResult | undefined): DriverCheck | null {
  if (
    !result ||
    result.status !== "loaded" ||
    !result.data ||
    !result.diagnostics
  ) {
    return null;
  }

  const { data, diagnostics } = result;
  const logDate = data.from;

  const yesterdayEvents = data.eventsData.filter(
    (event) =>
      mainEventCodes.includes(event.eventCode.id) &&
      event.eventTime.logDate.date === logDate,
  );

  const lastYesterdayEvent = yesterdayEvents.reduce<HosEvent | undefined>(
    (latest, event) =>
      !latest || event.eventTime.timestamp > latest.eventTime.timestamp
        ? event
        : latest,
    undefined,
  );

  const anchorEvent = findCertAnchorEvent({
    events: data.eventsData,
    selectedDay: DateTime.fromFormat(logDate, "yyyy/MM/dd", {
      zone: "America/Chicago",
    }),
  });

  const isDriving = lastYesterdayEvent?.eventCode.id === "DS_D";

  const isActive = Boolean(anchorEvent) || isDriving;

  const day = diagnostics.byDate[logDate];
  const certStatus = getCertStatus(day, isActive);

  const dailyLog = data.dailyLogsData.find(
    (log) => log.logDate.date === logDate,
  );

  const dailySummary = data.dailySummariesData.find(
    (summary) => summary.logDate.date === logDate,
  );

  const previousDate = DateTime.fromFormat(logDate, "yyyy/MM/dd", {
    zone: "America/Chicago",
  })
    .minus({ days: 1 })
    .toFormat("yyyy/MM/dd");

  const previousDailyLog = data.dailyLogsData.find(
    (log) => log.logDate.date === previousDate,
  );

  const signature =
    dailyLog?.form?.signature || previousDailyLog?.form?.signature;

  const needsCertFix = certStatus === "Missing" || certStatus === "Invalid";

  const hasTargetSignature = Boolean(dailyLog?.form?.signature);

  const issues: DriverIssue[] = [];

  if (needsCertFix) {
    if (!dailyLog?._id) {
      issues.push("No daily log");
    }

    if (!signature) {
      issues.push("No signature");
    }

    if (isDriving && !anchorEvent) {
      issues.push("Driving");
    }
  }

  if (hasTargetSignature && dailySummary?.isSigned !== true) {
    issues.push(dailySummary ? "Missing DLS" : "No DLS summary");
  }

  return {
    certStatus,
    isActive,
    issues,
    dailyLog,
    dailySummary,
    signature,
    anchorEvent,
    day,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function RouteComponent() {
  const { drivers } = useDriversData();

  const [results, setResults] = useState<Record<string, DriverResult>>({});
  const [checking, setChecking] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [bulkFixing, setBulkFixing] = useState(false);
  const [fixingIds, setFixingIds] = useState<Set<string>>(new Set());

  const [checkProgress, setCheckProgress] = useState<Progress | null>(null);
  const [actionProgress, setActionProgress] = useState<Progress | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    const loadingDriver = Object.entries(results).find(
      ([, result]) => result.status === "loading",
    );

    if (!loadingDriver) return;

    rowRefs.current[loadingDriver[0]]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [results]);

  const checkedCount = Object.values(results).filter(
    (result) => result.status === "loaded" || result.status === "error",
  ).length;

  const checkComplete =
    !!drivers?.length &&
    !checking &&
    drivers.every(
      (driver) =>
        results[driver.id]?.status === "loaded" ||
        results[driver.id]?.status === "error",
    );

  const checkedDrivers = (drivers ?? []).filter(
    (driver) => results[driver.id]?.status === "loaded",
  );

  const driversNeedingAttention = checkedDrivers.filter((driver) => {
    const check = getDriverCheck(results[driver.id]);

    return Boolean(
      check &&
      (check.certStatus === "Missing" ||
        check.certStatus === "Invalid" ||
        check.issues.length > 0),
    );
  });

  const refreshDriver = async (driverId: string) => {
    const data = await fetchCertificationData(driverId);

    const sortedEvents = [...data.eventsData].sort(
      (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
    );

    const diagnostics = buildLogCheck({
      events: sortedEvents,
      dailyLogs: data.dailyLogsData,
    });

    setResults((current) => ({
      ...current,
      [driverId]: {
        status: "loaded",
        data,
        diagnostics,
      },
    }));
  };

  const handleCheckAll = async () => {
    if (!drivers?.length || checking || bulkFixing || rechecking) return;

    setResults(
      Object.fromEntries(
        drivers.map((driver) => [driver.id, { status: "waiting" }]),
      ),
    );

    setCheckProgress({
      total: drivers.length,
      completed: 0,
    });

    setActionProgress(null);
    setChecking(true);

    try {
      for (const driver of drivers) {
        setResults((current) => ({
          ...current,
          [driver.id]: {
            status: "loading",
          },
        }));

        setCheckProgress((current) =>
          current ? { ...current, currentDriverId: driver.id } : current,
        );

        try {
          await refreshDriver(driver.id);
        } catch (error) {
          setResults((current) => ({
            ...current,
            [driver.id]: {
              status: "error",
              error: error instanceof Error ? error.message : "Request failed",
            },
          }));
        } finally {
          setCheckProgress((current) =>
            current
              ? {
                  ...current,
                  completed: current.completed + 1,
                  currentDriverId: undefined,
                }
              : current,
          );
        }

        await sleep(300);
      }
    } finally {
      setChecking(false);
    }
  };

  const handleRecheck = async () => {
    if (!checkComplete || checking || bulkFixing || rechecking) return;

    const driverIds = driversNeedingAttention.map((driver) => driver.id);

    if (!driverIds.length) return;

    setRechecking(true);
    setActionProgress({
      total: driverIds.length,
      completed: 0,
    });

    try {
      for (const driverId of driverIds) {
        setFixingIds((current) => new Set(current).add(driverId));

        setActionProgress((current) =>
          current ? { ...current, currentDriverId: driverId } : current,
        );

        try {
          await refreshDriver(driverId);
        } catch (error) {
          console.error(`Failed to recheck ${driverId}:`, error);
        } finally {
          setFixingIds((current) => {
            const next = new Set(current);
            next.delete(driverId);
            return next;
          });

          setActionProgress((current) =>
            current
              ? {
                  ...current,
                  completed: current.completed + 1,
                  currentDriverId: undefined,
                }
              : current,
          );
        }

        await sleep(300);
      }
    } finally {
      setRechecking(false);
    }
  };

  const fixCertification = async (driverId: string): Promise<FixResult> => {
    const result = results[driverId];

    if (result?.status !== "loaded" || !result.data || !result.diagnostics) {
      return {
        status: "skipped",
        reason: "Driver has not been checked.",
      };
    }

    const { data } = result;
    const logDate = data.from;
    const check = getDriverCheck(result);

    if (!check) {
      return {
        status: "skipped",
        reason: "Driver data unavailable.",
      };
    }

    const { certStatus, dailyLog, dailySummary, signature, anchorEvent, day } =
      check;

    let changed = false;

    if (certStatus === "Missing" || certStatus === "Invalid") {
      if (!dailyLog?._id) {
        console.warn(
          `${driverId}: daily log is missing. Skipping certification.`,
        );
      } else if (!signature) {
        console.warn(`${driverId}: no available signature.`);
      } else if (!anchorEvent) {
        console.warn(`${driverId}: no certification anchor.`);
      } else {
        const certTs = anchorEvent.eventTime.timestamp + 12_000;

        const {
          eld,
          location,
          recordStatus,
          recordOrigin,
          totalVehicleMiles,
          totalEngineHours,
          eventComment,
          ...base
        } = anchorEvent;

        const certEvent: HosEvent = {
          ...base,
          _id: generateHosEventId(),
          seqId: (parseInt(anchorEvent.seqId, 16) + 1).toString(16),
          eventCode: { id: "DR_CERT_1" },
          eventTime: {
            ...anchorEvent.eventTime,
            timestamp: certTs,
          },
          certifiedRecordLogDate: {
            date: logDate,
            logStartOffset: anchorEvent.eventTime.logDate.logStartOffset ?? 0,
            timeZone: anchorEvent.eventTime.logDate.timeZone,
          },
        };

        const updatedDailyLog = {
          ...dailyLog,
          form: {
            ...dailyLog.form,
            signature,
          },
        };

        if (certStatus === "Invalid") {
          for (const existingCert of day?.derived.certificationEvents ?? []) {
            await deleteHosEvent(existingCert._id);
          }
        }

        await upsertHosEvent(certEvent._id, certEvent);
        await upsertDailyLog(dailyLog._id, updatedDailyLog);

        changed = true;
      }
    }

    if (dailySummary?._id && dailySummary.isSigned === false) {
      await upsertDailyLogSummary(dailySummary._id, {
        ...dailySummary,
        isSigned: true,
      });

      changed = true;
    }

    if (changed) {
      await refreshDriver(driverId);
      return { status: "fixed" };
    }

    return {
      status: "skipped",
      reason: "No applicable fixes could be performed.",
    };
  };

  const handleFixSingle = async (driverId: string) => {
    if (fixingIds.has(driverId) || checking || bulkFixing || rechecking) {
      return;
    }

    setFixingIds((current) => new Set(current).add(driverId));

    try {
      const outcome = await fixCertification(driverId);

      if (outcome.status === "skipped") {
        console.warn(`Skipped ${driverId}: ${outcome.reason}`);
      }
    } catch (error) {
      console.error(`Failed to fix ${driverId}:`, error);
    } finally {
      setFixingIds((current) => {
        const next = new Set(current);
        next.delete(driverId);
        return next;
      });
    }
  };

  const handleBulkFix = async () => {
    if (!checkComplete || checking || bulkFixing || rechecking) return;

    const driverIds = driversNeedingAttention.map((driver) => driver.id);

    if (!driverIds.length) return;

    setBulkFixing(true);
    setActionProgress({
      total: driverIds.length,
      completed: 0,
    });

    try {
      for (const driverId of driverIds) {
        setFixingIds((current) => new Set(current).add(driverId));

        setActionProgress((current) =>
          current ? { ...current, currentDriverId: driverId } : current,
        );

        try {
          const outcome = await fixCertification(driverId);

          if (outcome.status === "skipped") {
            console.warn(`Skipped ${driverId}: ${outcome.reason}`);
          }
        } catch (error) {
          console.error(`Failed to fix ${driverId}:`, error);
        } finally {
          setFixingIds((current) => {
            const next = new Set(current);
            next.delete(driverId);
            return next;
          });

          setActionProgress((current) =>
            current
              ? {
                  ...current,
                  completed: current.completed + 1,
                  currentDriverId: undefined,
                }
              : current,
          );
        }

        await sleep(300);
      }
    } finally {
      setBulkFixing(false);
    }
  };

  const statusForDriver = (driverId: string) => {
    const result = results[driverId];

    if (!result || result.status === "waiting") return "Not checked";
    if (result.status === "loading") return "Checking…";
    if (result.status === "error") return "Error";

    return getDriverCheck(result)?.certStatus ?? "No data";
  };

  const rightProgressActive = rechecking || bulkFixing;

  const yesterdayLabel = DateTime.now()
    .setZone("America/Chicago")
    .minus({ days: 1 })
    .toFormat("MMM d");

  return (
    <main className="mx-auto max-w-[1600px] space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Driver certifications</h1>
        <p className="text-muted-foreground text-sm">
          Check driver certifications and resolve issues.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* LEFT: ALL DRIVERS */}
        <section className="min-w-0 overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">All drivers</h2>
              <p className="text-muted-foreground text-xs">
                {checkedCount} of {drivers?.length ?? 0} checked
              </p>
            </div>

            <button
              onClick={handleCheckAll}
              disabled={
                !drivers?.length || checking || bulkFixing || rechecking
              }
              className="bg-primary text-primary-foreground cursor-pointer rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
            >
              {checking ? "Checking…" : "Check All"}
            </button>
          </div>

          <ProgressBar progress={checkProgress} active={checking} />

          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/80 sticky top-0 z-10">
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 text-right font-medium whitespace-nowrap">
                    Yesterday · {yesterdayLabel}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {(drivers ?? []).map((driver) => {
                  const status = statusForDriver(driver.id);
                  const isFixing = fixingIds.has(driver.id);
                  const isChecking =
                    checking && checkProgress?.currentDriverId === driver.id;
                  const isRechecking =
                    rechecking && actionProgress?.currentDriverId === driver.id;

                  return (
                    <tr
                      key={driver.id}
                      ref={(el) => {
                        rowRefs.current[driver.id] = el;
                      }}
                      onClick={() =>
                        window.open(
                          `/drivers/${driver.id}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className="hover:bg-muted/40 h-11 cursor-pointer transition-colors"
                    >
                      <td colSpan={2} className="p-0">
                        <div className="relative grid h-11 grid-cols-[1fr_auto] items-center">
                          <div className="px-4 py-2 font-medium">
                            {driver.name ?? driver.id}
                          </div>

                          <div className="px-4 py-2 text-right">
                            <StatusPill status={status} />
                          </div>

                          {(isChecking || isRechecking || isFixing) && (
                            <div className="bg-background/65 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px]">
                              <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                                <span className="border-primary size-4 animate-spin rounded-full border-2 border-r-transparent" />
                                {isChecking
                                  ? "Checking driver…"
                                  : isRechecking
                                    ? "Rechecking driver…"
                                    : "Fixing driver…"}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!drivers?.length && (
                  <tr>
                    <td
                      colSpan={2}
                      className="text-muted-foreground px-4 py-10 text-center"
                    >
                      No drivers available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT: RESULTS */}
        <section className="min-w-0 overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">Results</h2>
              <p className="text-muted-foreground text-xs">
                {driversNeedingAttention.length} drivers need attention
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleRecheck}
                disabled={
                  !checkComplete ||
                  !driversNeedingAttention.length ||
                  checking ||
                  bulkFixing ||
                  rechecking
                }
                className="hover:bg-muted cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {rechecking ? "Rechecking…" : "Recheck"}
              </button>

              <button
                onClick={handleBulkFix}
                disabled={
                  !checkComplete ||
                  !driversNeedingAttention.length ||
                  checking ||
                  bulkFixing ||
                  rechecking
                }
                className="bg-primary text-primary-foreground cursor-pointer rounded-md px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkFixing ? "Fixing…" : "Auto Fix"}
              </button>
            </div>
          </div>

          <ProgressBar progress={actionProgress} active={rightProgressActive} />

          <div className="max-h-[65vh] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted/80 sticky top-0 z-10">
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Driver</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Issues</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {driversNeedingAttention.map((driver) => {
                  const check = getDriverCheck(results[driver.id]);
                  const isFixing = fixingIds.has(driver.id);
                  const isRechecking =
                    rechecking && actionProgress?.currentDriverId === driver.id;

                  if (!check) return null;

                  return (
                    <tr
                      key={driver.id}
                      onClick={() =>
                        window.open(
                          `/drivers/${driver.id}`,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className={`hover:bg-muted/40 relative h-11 cursor-pointer transition-all ${
                        isRechecking ? "pointer-events-none" : ""
                      }`}
                    >
                      <td className="px-4 py-2 font-medium">
                        {driver.name ?? driver.id}
                      </td>

                      <td className="px-4 py-2 whitespace-nowrap">
                        <StatusPill status={check.certStatus} />
                      </td>

                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {check.issues.map((issue) => (
                            <IssuePill key={issue} issue={issue} />
                          ))}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleFixSingle(driver.id);
                          }}
                          disabled={
                            checking || bulkFixing || rechecking || isFixing
                          }
                          className="hover:bg-muted inline-flex min-w-16 items-center justify-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Fix
                        </button>
                      </td>

                      {(isRechecking || isFixing) && (
                        <td
                          colSpan={4}
                          className="bg-background/65 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[3px]"
                        >
                          <span className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                            <span className="border-primary size-4 animate-spin rounded-full border-2 border-r-transparent" />
                            {isRechecking
                              ? "Rechecking driver…"
                              : "Fixing driver…"}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {driversNeedingAttention.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center">
                      {!checkComplete ? (
                        <div className="space-y-2">
                          <p className="font-medium">
                            Run Check All to see results
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Drivers with certification issues will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-medium">No issues found</p>
                          <p className="text-muted-foreground text-sm">
                            All checked drivers are valid or inactive.
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProgressBar({
  progress,
  active,
}: {
  progress: Progress | null;
  active: boolean;
}) {
  if (!progress) {
    return <div className="bg-muted h-1" />;
  }

  const percentage = progress.total
    ? (progress.completed / progress.total) * 100
    : 0;

  return (
    <div className="space-y-1 px-4 py-2">
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>
          {progress.completed} / {progress.total}
          {progress.currentDriverId ? ` · ${progress.currentDriverId}` : ""}
        </span>
        <span>{active ? "Processing" : "Complete"}</span>
      </div>

      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Valid: "bg-green-100 text-green-800",
    Missing: "bg-orange-100 text-orange-800",
    Invalid: "bg-red-100 text-red-800",
    Inactive: "bg-gray-100 text-gray-600",
    "No data": "bg-gray-100 text-gray-600",
    Error: "bg-red-100 text-red-800",
    "Not checked": "bg-muted text-muted-foreground",
    "Checking…": "bg-blue-100 text-blue-800",
    "Fixing…": "bg-blue-100 text-blue-800",
    "Rechecking…": "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        styles[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function IssuePill({ issue }: { issue: DriverIssue }) {
  const styles: Record<DriverIssue, string> = {
    "Missing DLS": "bg-yellow-100 text-yellow-800",
    Driving: "bg-yellow-100 text-yellow-800",
    "No signature": "bg-orange-100 text-orange-800",
    "No daily log": "bg-red-100 text-red-800",
    "No DLS summary": "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap ${styles[issue]}`}
    >
      {issue}
    </span>
  );
}
