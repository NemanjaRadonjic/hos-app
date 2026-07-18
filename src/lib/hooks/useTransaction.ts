import { useState, useEffect, useMemo } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { DateTime } from "luxon";
import type { HosEvent, DailyLog, DailyLogForm, Company } from "../types";
import {
  CHUNK_DAYS,
  flattenDailyLogsData,
  useDailyLogsData,
  type Range,
} from "./useDailyLogData";
import { useCompany } from "./useCompany";
import {
  buildDailyLog,
  buildDailyLogSummary,
  generateHosEventId,
} from "../hos/helpers";
import { useDriverData } from "./useDriverData";
import {
  createTransaction,
  deleteHosEvent,
  generateInterlocations,
  updateTransaction,
  upsertDailyLog,
  upsertDailyLogSummary,
  upsertHosEvent,
} from "../api";
import { sortEvents } from "../helpers/sort-events";
import { findNearestSignature } from "./helpers/find-nearest-signature";
import { toast } from "sonner";
import { findCertAnchorEvent } from "./helpers/find-cert-anchor";
import { isDayCertified } from "./helpers/check-date-certified";
import { runQueue, type QueueItem } from "../helpers/api-helpers";
import { buildInterlocations } from "./helpers/build-interlocations";
import { getCalculatedLocationData } from "../helpers/get-calculated-location";
import type { DriverSimplified } from "./useDriversData";
import type { ExecutionPhase } from "@/components/transaction-dialog";

type TransactionStatus = "idle" | "pending" | "saving" | "error";

export type ExecutionCallbacks = {
  onPhaseChange?: (phase: "creating" | "saving" | "finalizing") => void;
  onProgress?: (progress: CommitProgress) => void;
};

export type TransactionDetails = {
  from: string | null;
  to: string | null;
  updatedEvents: number;
  addedEvents: number;
  changedLogs: number;
  deletedEvents: number;
  totalRequests: number;
};

export type TransactionPayload = {
  eventChanges: EventChange[];
  logChanges: DailyLogChange[];
};

export type TransactionEvent =
  | EventChange
  | {
      eventId: string;
      operation: null;
      before: HosEvent;
      after: null;
    };

export type DailyLogChange =
  | {
      logId: string;
      logDate: string;
      operation: "create";
      before: null;
      after: DailyLog;
    }
  | {
      logId: string;
      logDate: string;
      operation: "update";
      before: DailyLog;
      after: DailyLog;
    };

export type EventChange =
  | {
      eventId: string;
      operation: "create";
      before: null;
      after: HosEvent;
    }
  | {
      eventId: string;
      operation: "update";
      before: HosEvent;
      after: HosEvent;
    }
  | {
      eventId: string;
      operation: "delete";
      before: HosEvent;
      after: null;
    };

const toArray = (input: HosEvent | HosEvent[]) =>
  Array.isArray(input) ? input : [input];

export function isServerLockedEvent(input: HosEvent | HosEvent[]): boolean {
  return toArray(input).some((event) => event.i);
}

export function isUserLockedEvent(input: HosEvent | HosEvent[]): boolean {
  return toArray(input).some((event) => event.eventComment === "test");
}

export function isLockedEvent(input: HosEvent | HosEvent[]): boolean {
  return toArray(input).some(
    (event) => event.i || event.eventComment === "test",
  );
}

const toastLocked = () => {
  toast.error("Locked events cannot be changed.");
};

export type CommitProgress = {
  done: number;
  total: number;
  success: number;
  failed: number;
  current?: string;
  waiting: {
    reason: "server";
    label: string;
  } | null;
};

type CommitResult = {
  failed: string[];
};

export const useTransaction = (userId: string, selectedDay: DateTime) => {
  const queryClient = useQueryClient();
  const { driver } = useDriverData(userId);
  const { data: company } = useCompany();

  // cache
  const {
    data,
    fetchNextPage: fetchPreviousRange,
    fetchRange,
    hasNextPage: hasMore,
    isFetchingNextPage: isFetchingMore,
  } = useDailyLogsData(userId, selectedDay);

  const [status, setStatus] = useState<TransactionStatus>("idle");

  const [deletedEventIds, setDeletedEventIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [events, _setEvents] = useState<HosEvent[]>([]);
  const setEvents = (next: HosEvent[] | ((prev: HosEvent[]) => HosEvent[])) => {
    _setEvents((prev) => {
      const nextEvents = typeof next === "function" ? next(prev) : next;
      return sortEvents(nextEvents);
    });
  };

  const [dailyLogEdits, setDailyLogEdits] = useState<Record<string, DailyLog>>(
    {},
  );

  // alert on window close if status not idle
  useEffect(() => {
    if (status === "idle") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [status]);

  const savePayload = useMemo<TransactionPayload>(() => {
    const originalEvents = data?.eventsData ?? [];
    const originalLogs = data?.dailyLogsData ?? [];

    const eventChanges = buildEventChanges({
      originalEvents,
      currentEvents: events,
      deletedEventIds,
    });

    const logChanges = buildLogChanges({
      originalLogs,
      dailyLogEdits,
      driver,
      company,
      selectedDay,
    });

    return {
      eventChanges,
      logChanges,
    };
  }, [
    data,
    events,
    deletedEventIds,
    dailyLogEdits,
    driver,
    company,
    selectedDay,
  ]);

  // handle status state directly from the diffing
  useEffect(() => {
    const isChanged =
      savePayload.eventChanges.length > 0 || savePayload.logChanges.length > 0;

    const nextStatus = isChanged ? "pending" : "idle";

    setStatus((prev) => {
      if (prev === "error") return prev;
      return prev === nextStatus ? prev : nextStatus;
    });
  }, [savePayload]);

  const getSummary = (date: string) =>
    data?.dailySummariesData.find((s) => s.logDate.date === date);

  // ─── sync events from cache into local state ──────────────────────────────
  // only re-syncs when a new page is fetched (pageCount changes)
  // not on every render — avoids overwriting user edits
  const pageCount = data?.pages.length ?? 0;

  useEffect(() => {
    setEvents([]);
    setDailyLogEdits({});
    setDeletedEventIds(new Set());
  }, [userId]);

  useEffect(() => {
    const serverEvents = data?.eventsData ?? [];
    if (serverEvents.length === 0) return;

    setEvents((prev) => {
      const prevIds = new Set(prev.map((event) => event._id));

      const eventsToAppend = serverEvents.filter(
        (serverEvent) =>
          !prevIds.has(serverEvent._id) &&
          !deletedEventIds.has(serverEvent._id),
      );

      if (eventsToAppend.length === 0) return prev;

      return [...prev, ...eventsToAppend];
    });
  }, [pageCount, userId, deletedEventIds]);

  // SELECT DATE
  useEffect(() => {
    if (!data) return;

    const selectedDate = selectedDay.startOf("day");

    const isLoaded = data.pages.some((page) => {
      return selectedDate >= page.range.from && selectedDate <= page.range.to;
    });

    if (isLoaded) return;

    fetchRange({
      from: selectedDay.minus({ days: 8 }).startOf("day"),
      to: selectedDay.plus({ days: 8 }).endOf("day"),
    });
  }, [selectedDay, data?.pages.length, fetchRange]);

  // PREFETCH
  useEffect(() => {
    if (!data || isFetchingMore) return;

    const selected = selectedDay.startOf("day");

    const page = data.pages.find(
      (page) => selected >= page.range.from && selected <= page.range.to,
    );

    if (!page) return;

    const daysFromStart = selected.diff(page.range.from, "days").days;

    if (daysFromStart <= CHUNK_DAYS / 2) {
      fetchRange({
        from: page.range.from.minus({ days: CHUNK_DAYS + 1 }).startOf("day"),
        to: page.range.from.minus({ days: 1 }).endOf("day"),
      });
    }
  }, [selectedDay, data?.pages.length, isFetchingMore]);

  // in reality, currently, this is dependant on an another event
  // its used on duplicate only
  const duplicateEvent = (event: HosEvent) => {
    if (isLockedEvent(event)) {
      toastLocked();
      return;
    }

    const { eventComment, ...rest } = event;

    const newEvent: HosEvent = {
      ...rest,
      _id: generateHosEventId(),
    };

    setEvents([...events, newEvent]);

    return newEvent;
  };

  const deleteEvents = (eventIds: string | Set<string>) => {
    const ids = eventIds instanceof Set ? eventIds : new Set([eventIds]);

    const locked = events.find((e) => ids.has(e._id) && isLockedEvent(e));

    if (locked) {
      toastLocked();
      return;
    }

    setDeletedEventIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

    setEvents((prev) => prev.filter((e) => !ids.has(e._id)));
  };

  const updateEvent = (id: string, updater: (event: HosEvent) => HosEvent) => {
    const target = events.find((e) => e._id === id);

    if (target && isServerLockedEvent(target)) {
      toastLocked();
      return;
    }

    setEvents(
      events.map((event) => (event._id === id ? updater(event) : event)),
    );
  };

  const updateEventsTimestamp = ({
    selectedIds,
    deltaMs,
  }: {
    selectedIds: Set<string>;
    deltaMs: number;
  }) => {
    const selectedEvents = events.filter((e) => selectedIds.has(e._id));
    // future guard
    if (
      selectedEvents.some(
        (event) =>
          event.eventTime.timestamp + deltaMs > DateTime.now().toMillis(),
      )
    ) {
      toast.error("Cannot move events into the future.");
      return;
    }
    if (isLockedEvent(selectedEvents)) {
      toastLocked();
      return;
    }

    const nextEvents = events.map((e) => {
      if (!selectedIds.has(e._id)) return e;

      const newTimestamp = e.eventTime.timestamp + deltaMs;
      const newDate = DateTime.fromMillis(newTimestamp).toFormat("yyyy/MM/dd");

      return {
        ...e,
        eventTime: {
          ...e.eventTime,
          timestamp: newTimestamp,
          logDate: {
            ...e.eventTime.logDate,
            date: newDate,
          },
        },
      };
    });

    // cross guard
    const beforeOrder = sortEvents(events).map((e) => e._id);
    const afterOrder = sortEvents(nextEvents).map((e) => e._id);

    const crossed = beforeOrder.some((id, index) => afterOrder[index] !== id);

    if (crossed) {
      toast.error("Cannot move events past other events.");
      return;
    }

    setEvents(nextEvents);
  };

  // ─── daily log helpers ────────────────────────────────────────────────────
  // getDailyLog merges the server data with any local edits for a given date
  // so components always get the latest version without touching the cache
  const getDailyLog = (date: string) => {
    const base = data?.dailyLogsData.find((l) => l.logDate.date === date);

    if (!base) {
      // check if a new log was created in edits for this date
      const newLog = Object.values(dailyLogEdits).find(
        (edit) => edit.logDate?.date === date,
      );
      return newLog ?? undefined;
    }

    return { ...base, ...dailyLogEdits[base._id] };
  };

  const updateDailyLog = (id: string, changes: Partial<DailyLogForm>) => {
    const existing = data?.dailyLogsData.find((l) => l._id === id);

    if (!driver || !company) {
      console.log("Driver or company not available.");
      return null;
    }

    setDailyLogEdits((prev) => {
      const base =
        existing ??
        buildDailyLog({ dailyLogId: id, driver, selectedDay, company });
      const prevEdits = prev[id] ?? {};

      const form = {
        ...base.form,
        ...(prevEdits.form ?? {}),
        ...changes,
      };

      if (!changes.signature) delete form.signature;
      if (!changes.coDriver) delete form.coDriver;

      return {
        ...prev,
        [id]: {
          ...base,
          ...prevEdits,
          form,
        },
      };
    });
  };

  const commit = async ({
    onPhaseChange,
    onProgress,
  }: ExecutionCallbacks): Promise<CommitResult> => {
    setStatus("saving");

    const { eventChanges, logChanges } = savePayload;

    const originalEvents = data?.eventsData ?? [];

    const dates = new Set<string>();

    for (const change of eventChanges) {
      if (change.before) {
        dates.add(change.before.eventTime.logDate.date);
      }

      if (change.after) {
        dates.add(change.after.eventTime.logDate.date);
      }
    }

    for (const change of logChanges) {
      dates.add(change.logDate);
    }

    const sortedDates = [...dates].sort();

    const fromDate = sortedDates[0] ?? null;
    const toDate = sortedDates.at(-1) ?? null;

    if (!fromDate || !toDate) {
      throw new Error("Cannot create a transaction without an affected range.");
    }

    const transactionEvents = buildTransactionEvents({
      originalEvents,
      eventChanges,
      fromDate,
      toDate,
    });

    onPhaseChange?.("creating");

    const transaction = await createTransaction({
      driverId: driver.id,
      fromDate,
      toDate,
      eventChanges,
      logChanges,
      transactionEvents,
      maxTimeShiftMs: getMaxTimeShiftMs(eventChanges),
    });

    onPhaseChange?.("saving");

    const items: QueueItem[] = [];
    for (const change of logChanges) {
      const log = change.after;
      const summaryId = log._id.replace("DailyLog:", "DailyLogSummary:");

      items.push({
        id: log._id,
        label: `Log ${log.logDate.date}`,
        run: async () => {
          await upsertDailyLog(log._id, log);

          const existingSummary = getSummary(log.logDate.date);

          const summary = existingSummary
            ? {
                ...existingSummary,
                hasForms: true,
                isSigned: Boolean(log.form.signature),
              }
            : buildDailyLogSummary({
                id: summaryId,
                dId: driver.dId,
                userId: driver.id,
                date: log.logDate.date,
                isSigned: Boolean(log.form.signature),
              });

          await upsertDailyLogSummary(summaryId, summary);
        },
      });
    }

    for (const change of eventChanges) {
      switch (change.operation) {
        case "create":
        case "update":
          items.push({
            id: change.eventId,
            label: `Event ${change.eventId}`,
            run: () => upsertHosEvent(change.eventId, change.after),
          });
          break;

        case "delete":
          items.push({
            id: change.eventId,
            label: `Delete ${change.eventId}`,
            run: () => deleteHosEvent(change.eventId),
          });
          break;
      }
    }

    await runQueue({
      items,
      batchSize: 2,
      launchEveryMs: 100,
      onProgress: (p) => {
        onProgress?.({
          done: p.done,
          total: p.total,
          success: p.success,
          failed: p.failed,
          current: p.current,
          waiting: p.waiting,
        });
      },
    });

    onPhaseChange?.("finalizing");

    await updateTransaction(transaction.id, {
      status: "success",
    });

    await queryClient.refetchQueries({
      queryKey: ["driverData", userId],
    });

    const rawFreshData = queryClient.getQueryData<
      InfiniteData<DailyLogsPage, Range>
    >(["driverData", userId]);

    const freshData = flattenDailyLogsData(rawFreshData);

    setEvents(freshData.eventsData);
    setDailyLogEdits({});
    setDeletedEventIds(new Set());
    return {
      failed: [],
    };
  };

  const transactionDetails = useMemo<TransactionDetails>(() => {
    const { eventChanges, logChanges } = savePayload;
    console.log({ eventChanges, logChanges });
    const dates = new Set<string>();

    for (const change of eventChanges) {
      if (change.before) {
        dates.add(change.before.eventTime.logDate.date);
      }

      if (change.after) {
        dates.add(change.after.eventTime.logDate.date);
      }
    }

    for (const change of logChanges) {
      dates.add(change.logDate);
    }

    const sortedDates = [...dates].sort();

    const updatedEvents = eventChanges.filter(
      (change) => change.operation === "update",
    ).length;

    const addedEvents = eventChanges.filter(
      (change) => change.operation === "create",
    ).length;

    const deletedEvents = eventChanges.filter(
      (change) => change.operation === "delete",
    ).length;

    return {
      from: sortedDates[0] ?? null,
      to: sortedDates.at(-1) ?? null,

      updatedEvents,
      addedEvents,
      deletedEvents,
      changedLogs: logChanges.length,

      totalRequests: eventChanges.length + logChanges.length * 2,
    };
  }, [savePayload]);

  const reset = () => {
    const cachedData = queryClient.getQueryData<InfiniteData<DailyLogsPage>>([
      "driverData",
      userId,
    ]);
    const originalEvents = cachedData?.pages.flatMap((p) => p.eventsData) ?? [];
    setEvents(originalEvents);
    setDailyLogEdits({});
    setDeletedEventIds(new Set());
  };

  // FUNCTIONS ////////////////////////////////////////////////////////////////

  const fixCert = (selectedDay: DateTime) => {
    const logDate = selectedDay.toFormat("yyyy/MM/dd");

    if (selectedDay.hasSame(DateTime.now(), "day")) {
      toast.error("Current day cannot be certified yet.");
      return;
    }

    if (isDayCertified(events, logDate)) {
      toast.error("This day is already certified.");
      return;
    }

    const anchorEvent = findCertAnchorEvent({
      events,
      selectedDay,
    });

    if (!anchorEvent) {
      toast.error("No valid status event found.");
      return;
    }

    const dailyLog = getDailyLog(logDate);
    const signature = findNearestSignature(data?.dailyLogsData ?? [], logDate);

    if (!dailyLog?._id || !signature) {
      toast.error("No signature found for this log.");
      return;
    }

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

      eventCode: {
        id: "DR_CERT_1",
      },

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

    setEvents([...events, certEvent]);

    updateDailyLog(dailyLog._id, {
      signature,
    });
  };

  const fixInt = async (selectedId: string) => {
    const selected = events.find((e) => e._id === selectedId);

    if (!selected) return;
    if (isLockedEvent(selected)) {
      toastLocked();
      return;
    }

    const sorted = sortEvents(events);
    const selectedIndex = sorted.findIndex((e) => e._id === selectedId);

    const endEvent = sorted
      .slice(selectedIndex + 1)
      .find((e) => ["DS_OFF", "DS_SB", "DS_ON"].includes(e.eventCode.id));

    if (!endEvent) {
      toast.error("No ending duty status event found.");
      return;
    }

    if (
      selected.totalVehicleMiles == null ||
      endEvent.totalVehicleMiles == null
    ) {
      toast.error("Missing odometer");
      return;
    }

    if (!selected.location || !endEvent.location) {
      toast.error("Start or end location is missing.");
      return;
    }
    const startTs = selected.eventTime.timestamp;
    const endTs = endEvent.eventTime.timestamp;

    if (endTs - startTs <= 60 * 60 * 1000) {
      toast.error("This driving doesn't need interlocations");
      return;
    }

    const { routes } = await generateInterlocations({
      start: {
        lat: selected.location.lat,
        lng: selected.location.lon,
      },
      end: {
        lat: endEvent.location.lat,
        lng: endEvent.location.lon,
      },
    });

    if (!routes) {
      toast.error("Failed to generate route.");
      return;
    }
    const odometerDiff =
      endEvent.totalVehicleMiles - selected.totalVehicleMiles;
    const rankedRoutes = routes
      .map((route: any) => ({
        ...route,
        diffMiles: Math.abs(route.distanceMiles - odometerDiff),
        diffPercent:
          Math.abs(route.distanceMiles - odometerDiff) / odometerDiff,
      }))
      .sort((a: any, b: any) => a.diffMiles - b.diffMiles);

    // block invalid
    const route = rankedRoutes[0];

    const routeMiles = route.distanceMiles;

    const diffMiles = Math.abs(routeMiles - odometerDiff);

    const allowedDiffMiles = Math.max(2, odometerDiff * 0.08);

    if (diffMiles > allowedDiffMiles) {
      toast.error(
        `Route distance does not match odometer. Route: ${routeMiles.toFixed(
          1,
        )} mi, odometer: ${odometerDiff.toFixed(1)} mi.`,
      );
      return;
    }

    const points = buildInterlocations({
      routeCoordinates: route.coordinates,
      startTs,
      endTs,
      startOdometer: selected.totalVehicleMiles,
      endOdometer: endEvent.totalVehicleMiles,
    });

    const interlocationEvents = points.map((point) => {
      const locationData = getCalculatedLocationData(
        point.location.lat,
        point.location.lng,
      );
      return {
        ...selected,
        _id: generateHosEventId(),
        eventCode: { id: "LOG_NORMAL_PRECISION" },
        eventTime: {
          ...selected.eventTime,
          timestamp: point.timestamp,
          logDate: {
            ...selected.eventTime.logDate,
            date: DateTime.fromMillis(point.timestamp).toFormat("yyyy/MM/dd"),
          },
        },

        location: {
          lat: point.location.lat,
          lon: point.location.lng,
          calculatedLocation: locationData.calculatedLocation,
          source: "E",
          state: locationData.state,
          timestamp: point.timestamp,
        },

        totalVehicleMiles: point.odometer,
      };
    });

    const replacedEvents = events.filter(
      (event) =>
        event._id !== selected._id &&
        event._id !== endEvent._id &&
        event.eventTime.timestamp > selected.eventTime.timestamp &&
        event.eventTime.timestamp < endEvent.eventTime.timestamp,
    );

    deleteEvents(new Set(replacedEvents.map((event) => event._id)));

    setEvents((prev) => [...prev, ...interlocationEvents]);
  };

  const fixSeqIds = () => {
    const from = DateTime.now()
      .setZone("America/Chicago")
      .startOf("day")
      .minus({ days: 8 })
      .toMillis();

    const recentEvents = sortEvents(
      events.filter((event) => event.eventTime.timestamp >= from),
    );

    if (isServerLockedEvent(recentEvents)) {
      toast.error("Some events are locked");
      return;
    }

    if (recentEvents.length === 0) {
      toast.error("No events found in the last 8 days.");
      return;
    }

    const lastEvent = recentEvents.at(-1)!;
    const lastSeqId = parseInt(lastEvent.seqId, 16);

    if (!Number.isFinite(lastSeqId)) {
      throw new Error(`Invalid seqId: ${lastEvent.seqId}`);
    }

    const firstSeqId = lastSeqId - (recentEvents.length - 1);

    if (firstSeqId < 0) {
      toast.error("Can't fix id's because some would be negative");
      return;
    }

    const seqIdsById = new Map(
      recentEvents.map((event, index) => [
        event._id,
        (firstSeqId + index).toString(16),
      ]),
    );

    setEvents((previous) =>
      previous.map((event) => {
        const nextSeqId = seqIdsById.get(event._id);

        if (nextSeqId == null || nextSeqId === event.seqId) {
          return event;
        }

        return {
          ...event,
          seqId: nextSeqId,
        };
      }),
    );
    toast.success("ID's fixed successfully");
  };

  const fixEngineHours = () => {
    const fromTs = DateTime.now()
      .setZone("America/Chicago")
      .startOf("day")
      .minus({ days: 8 })
      .toMillis();

    const recentEvents = sortEvents(
      events.filter(
        (event) =>
          event.eventTime.timestamp >= fromTs &&
          !event.eventCode.id.startsWith("DR_CERT_"),
      ),
    );

    if (recentEvents.length === 0) {
      toast.error("No events found in the last 8 days.");
      return;
    }

    const lastEvent = recentEvents.at(-1)!;
    const currentVehicleId = lastEvent.vehicle?.name ?? null;

    let segmentStartIndex = recentEvents.length - 1;

    for (let i = recentEvents.length - 2; i >= 0; i--) {
      const vehicleId = recentEvents[i].vehicle?.name ?? null;

      if (vehicleId !== currentVehicleId) {
        break;
      }

      segmentStartIndex = i;
    }

    const eventsToFix = recentEvents.slice(segmentStartIndex);

    if (isServerLockedEvent(eventsToFix)) {
      toast.error("Some events are locked.");
      return;
    }

    if (lastEvent.totalEngineHours == null) {
      toast.error("The last event is missing engine hours.");
      return;
    }

    const engineOnAfterEvent: boolean[] = [];
    let engineOn = true;

    for (let i = 0; i < eventsToFix.length; i++) {
      const event = eventsToFix[i];

      if (event.eventCode.id === "ENG_UP_NORMAL") {
        engineOn = true;
      } else if (event.eventCode.id === "ENG_DOWN_NORMAL") {
        engineOn = false;
      }

      engineOnAfterEvent[i] = engineOn;
    }

    const fixedEngineHoursById = new Map<string, number>();
    const anchorEngineHours = lastEvent.totalEngineHours;

    fixedEngineHoursById.set(
      lastEvent._id,
      roundEngineHours(anchorEngineHours),
    );

    let expectedHoursFromCurrentToLast = 0;

    for (let i = eventsToFix.length - 2; i >= 0; i--) {
      const current = eventsToFix[i];
      const next = eventsToFix[i + 1];

      const elapsedHours =
        (next.eventTime.timestamp - current.eventTime.timestamp) / 3_600_000;

      if (engineOnAfterEvent[i]) {
        expectedHoursFromCurrentToLast += elapsedHours;
      }

      const fixedEngineHours =
        anchorEngineHours - expectedHoursFromCurrentToLast;

      if (fixedEngineHours < 0) {
        toast.error(
          "Engine hours cannot be fixed because some would be negative.",
        );
        return;
      }

      fixedEngineHoursById.set(current._id, roundEngineHours(fixedEngineHours));
    }

    setEvents((prev) =>
      prev.map((event) => {
        const fixedEngineHours = fixedEngineHoursById.get(event._id);

        if (fixedEngineHours == null) {
          return event;
        }

        return {
          ...event,
          totalEngineHours: fixedEngineHours,
        };
      }),
    );

    toast.success(
      segmentStartIndex === 0
        ? "Engine hours fixed successfully."
        : "Engine hours fixed back to the most recent truck change.",
    );
  };

  const dailyLogs = [
    ...(data?.dailyLogsData ?? []).filter((log) => !dailyLogEdits[log._id]),
    ...Object.values(dailyLogEdits),
  ];

  return {
    status,

    getDailyLog,
    getSummary,
    transactionDetails,

    events,
    lastKnownEvent: data?.lastKnownEvent,
    duplicateEvent,
    updateEvent,
    deleteEvents,
    updateEventsTimestamp,
    setDailyLogEdits,

    summaries: data?.dailySummariesData ?? [],
    dailyLogs,

    // fetch control
    fetchPreviousRange,
    hasMore,
    isFetchingMore,

    // transaction
    // getSavePayload,
    reset,
    updateDailyLog,
    commit,

    // functions
    fixCert,
    fixInt,
    fixSeqIds,
    fixEngineHours,
  };
};

const buildLogChanges = ({
  originalLogs,
  dailyLogEdits,
  driver,
  company,
  selectedDay,
}: {
  originalLogs: DailyLog[];
  dailyLogEdits: Record<string, DailyLog>;
  driver?: DriverSimplified;
  company?: Company;
  selectedDay: DateTime;
}): DailyLogChange[] => {
  if (!driver || !company) return [];

  const originalMap = new Map(originalLogs.map((log) => [log._id, log]));

  return Object.entries(dailyLogEdits)
    .map(([id, editedLog]): DailyLogChange | null => {
      const original = originalMap.get(id);

      if (original) {
        if (deepEqual(original, editedLog)) {
          return null;
        }

        return {
          logId: id,
          logDate: editedLog.logDate.date,
          operation: "update",
          before: original,
          after: editedLog,
        };
      }

      const base = buildDailyLog({
        dailyLogId: id,
        driver,
        selectedDay,
        company,
      });

      if (deepEqual(base, editedLog)) {
        return null;
      }

      return {
        logId: id,
        logDate: editedLog.logDate.date,
        operation: "create",
        before: null,
        after: editedLog,
      };
    })
    .filter((change): change is DailyLogChange => change !== null);
};

const buildEventChanges = ({
  originalEvents,
  currentEvents,
  deletedEventIds,
}: {
  originalEvents: HosEvent[];
  currentEvents: HosEvent[];
  deletedEventIds: Set<string>;
}): EventChange[] => {
  const originalMap = new Map(
    originalEvents.map((event) => [event._id, event]),
  );

  const changes: EventChange[] = [];

  for (const current of currentEvents) {
    const original = originalMap.get(current._id);

    if (!original) {
      changes.push({
        eventId: current._id,
        operation: "create",
        before: null,
        after: current,
      });

      continue;
    }

    if (!deepEqual(original, current)) {
      changes.push({
        eventId: current._id,
        operation: "update",
        before: original,
        after: current,
      });
    }
  }

  for (const id of deletedEventIds) {
    const original = originalMap.get(id);

    if (!original) continue;

    changes.push({
      eventId: id,
      operation: "delete",
      before: original,
      after: null,
    });
  }

  return changes;
};

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (
    typeof a !== "object" ||
    a === null ||
    typeof b !== "object" ||
    b === null
  ) {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    return a.every((value, index) => deepEqual(value, b[index]));
  }

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
  );
}

// goes to server
export const buildTransactionEvents = ({
  originalEvents,
  eventChanges,
  fromDate,
  toDate,
}: {
  originalEvents: HosEvent[];
  eventChanges: EventChange[];
  fromDate: string;
  toDate: string;
}): TransactionEvent[] => {
  const changedIds = new Set(eventChanges.map((change) => change.eventId));

  const unchangedEvents: TransactionEvent[] = originalEvents
    .filter((event) => {
      const date = event.eventTime.logDate.date;

      return date >= fromDate && date <= toDate && !changedIds.has(event._id);
    })
    .map((event) => ({
      eventId: event._id,
      operation: null,
      before: event,
      after: null,
    }));

  return [...unchangedEvents, ...eventChanges].sort((a, b) => {
    const aTs =
      a.after?.eventTime.timestamp ?? a.before?.eventTime.timestamp ?? 0;

    const bTs =
      b.after?.eventTime.timestamp ?? b.before?.eventTime.timestamp ?? 0;

    return aTs - bTs;
  });
};

const getMaxTimeShiftMs = (eventChanges: EventChange[]) => {
  let maxShiftMs = 0;

  for (const change of eventChanges) {
    if (change.operation !== "update") continue;

    const beforeTs = change.before.eventTime.timestamp;
    const afterTs = change.after.eventTime.timestamp;

    const shiftMs = Math.abs(afterTs - beforeTs);

    maxShiftMs = Math.max(maxShiftMs, shiftMs);
  }

  return maxShiftMs;
};

const roundEngineHours = (value: number) =>
  Math.round((value + Number.EPSILON) * 10) / 10;
