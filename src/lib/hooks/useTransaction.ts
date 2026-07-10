import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { DateTime } from "luxon";
import type {
  HosEvent,
  DailyLog,
  DailyLogSummary,
  DailyLogForm,
} from "../types";
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
  deleteHosEvent,
  generateInterlocations,
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

type TransactionStatus = "idle" | "pending" | "saving" | "error";

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

  // handle status state directly from the diffing
  useEffect(() => {
    const { changedEvents, changedLogs, deletedEventIds } = getSavePayload();

    const isChanged =
      changedEvents.length > 0 ||
      changedLogs.length > 0 ||
      deletedEventIds.length > 0;

    const nextStatus = isChanged ? "pending" : "idle";

    setStatus((prev) => {
      if (prev === "error") return prev;
      if (prev === nextStatus) return prev;

      return nextStatus;
    });
  }, [userId, events, dailyLogEdits, data]);

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
    const newEvent: HosEvent = {
      ...event,
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

  const commit = async (
    onProgress?: (p: CommitProgress) => void,
  ): Promise<CommitResult> => {
    setStatus("saving");

    const { changedEvents, changedLogs, deletedEventIds } = getSavePayload();

    const items: QueueItem[] = [];

    for (const log of changedLogs) {
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

    for (const event of changedEvents) {
      items.push({
        id: event._id,
        label: `Event ${event._id}`,
        run: () => upsertHosEvent(event._id, event),
      });
    }

    for (const id of deletedEventIds) {
      items.push({
        id,
        label: `Delete ${id}`,
        run: () => deleteHosEvent(id),
      });
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

  // diffs state with cache, because of json string comparison and me not ordering
  // events properly yet, this will have some false changes that are basically the
  // same events/logs
  const getSavePayload = useCallback(() => {
    const cachedData = queryClient.getQueryData<InfiniteData<DailyLogsPage>>([
      "driverData",
      userId,
    ]);

    const originalEvents = cachedData?.pages.flatMap((p) => p.eventsData) ?? [];

    const originalLogs =
      cachedData?.pages.flatMap((p) => p.dailyLogsData) ?? [];

    const originalMap = new Map(originalEvents.map((e) => [e._id, e]));

    const changedEvents = events.filter((curr) => {
      const orig = originalMap.get(curr._id);

      const changed = JSON.stringify(orig) !== JSON.stringify(curr);

      return changed;
    });

    const deletedEventIdsToSave = [...deletedEventIds].filter((id) =>
      originalMap.has(id),
    );

    const changedLogs = Object.entries(dailyLogEdits)
      .map(([id, editedLog]) => {
        if (!driver || !company) return null;

        const base =
          originalLogs.find((log) => log._id === id) ??
          buildDailyLog({
            dailyLogId: id,
            driver,
            selectedDay,
            company,
          });

        const changed = JSON.stringify(base) !== JSON.stringify(editedLog);

        return changed ? editedLog : null;
      })
      .filter((log): log is DailyLog => log != null);

    return {
      changedEvents,
      deletedEventIds: deletedEventIdsToSave,
      changedLogs,
    };
  }, [
    queryClient,
    userId,
    events,
    dailyLogEdits,
    deletedEventIds,
    driver,
    company,
    selectedDay,
  ]);

  // temp log
  // const savePayload = getSavePayload();
  // console.log({ savePayload });

  const getSaveStats = () => {
    const { changedEvents, changedLogs, deletedEventIds } = getSavePayload();

    return {
      changedEvents: changedEvents.length,
      changedLogs: changedLogs.length,
      deletedEvents: deletedEventIds.length,
      totalRequests:
        changedEvents.length + deletedEventIds.length + changedLogs.length * 2, // daily log + summary
    };
  };

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
      toast.error("No future status event found to certify this day.");
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
    if (selected.eventCode.id !== "DS_D") {
      toast.error("Selected event is not a driving event.");
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

    setEvents((prev) => [
      ...prev.filter(
        (event) =>
          !(
            event._id !== selected._id &&
            event._id !== endEvent._id &&
            event.eventTime.timestamp > selected.eventTime.timestamp &&
            event.eventTime.timestamp < endEvent.eventTime.timestamp
          ),
      ),
      ...interlocationEvents,
    ]);
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

    const vehicleIds = new Set(
      recentEvents.map((event) => event.vehicle?.name ?? null),
    );

    if (vehicleIds.size !== 1) {
      toast.error("truck change");
      return;
    }

    const lastEvent = recentEvents.at(-1)!;

    if (lastEvent.totalEngineHours == null) {
      toast.error("The last event is missing engine hours.");
      return;
    }

    const engineOnAfterEvent: boolean[] = [];

    let engineOn = true;

    for (let i = 0; i < recentEvents.length; i++) {
      const event = recentEvents[i];

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

    for (let i = recentEvents.length - 2; i >= 0; i--) {
      const current = recentEvents[i];
      const next = recentEvents[i + 1];

      const elapsedHours =
        (next.eventTime.timestamp - current.eventTime.timestamp) / 3_600_000;

      if (engineOnAfterEvent[i]) {
        expectedHoursFromCurrentToLast += elapsedHours;
      }

      const fixedEngineHours =
        anchorEngineHours - expectedHoursFromCurrentToLast;

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
  };

  const dailyLogs = [
    ...(data?.dailyLogsData ?? []).filter((log) => !dailyLogEdits[log._id]),
    ...Object.values(dailyLogEdits),
  ];

  return {
    status,

    getDailyLog,
    getSummary,
    getSaveStats,

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
    getSavePayload,
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

const roundEngineHours = (value: number) =>
  Math.round((value + Number.EPSILON) * 10) / 10;
