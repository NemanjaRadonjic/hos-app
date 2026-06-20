import { useState, useEffect, useRef } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { DateTime } from "luxon";
import type {
  HosEvent,
  DailyLog,
  DailyLogSummary,
  DailyLogForm,
  HosEventPayload,
} from "../types";
import { CHUNK_DAYS, useDailyLogsData } from "./useDailyLogData";
import { useCompany } from "./useCompany";
import { getTokenPayload } from "../helpers";
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
import type { CertHosEvent } from "@/components/LogEvent/helpers/types";
import { runQueue, type QueueItem } from "../helpers/api-helpers";
import { buildInterlocations } from "./helpers/build-interlocations";
import { buildBasicEventType } from "@/components/LogEvent/EditForm/event-type-bodies";
import { getCalculatedLocationData } from "../helpers/get-calculated-location";

type TransactionStatus = "idle" | "pending" | "saving" | "error";

export type CommitProgress = {
  done: number;
  total: number;
  success: number;
  failed: number;
  current?: string;
  retrying?: {
    id: string;
    label: string;
    attempt: number;
    delayMs: number;
  } | null;
};

type CommitResult = {
  failed: string[];
};

export const useTransaction = (userId: string, selectedDay: DateTime) => {
  const queryClient = useQueryClient();
  const { driver } = useDriverData(userId);
  const { data: company } = useCompany();

  const [status, setStatus] = useState<TransactionStatus>("idle");
  // ─── server data ─────────────────────────────────────────────────────────
  // useDailyLogsData fetches everything from the server and caches it
  // we never mutate this cache — it stays as the ground truth / original snapshot
  const {
    data,
    fetchNextPage: fetchPreviousRange,
    hasNextPage: hasMore,
    isFetchingNextPage: isFetchingMore,
  } = useDailyLogsData(userId, selectedDay);

  const lastKnownEvent = data?.lastKnownEvent ?? null;

  // ─── local mutable state ──────────────────────────────────────────────────
  // events get copied into local state because they can be heavily mutated
  // (timestamp shifts, status changes, etc.)
  const [events, setEvents] = useState<HosEventPayload[]>([]);

  // dailyLogEdits is a sparse delta — only the fields that changed per log id
  const [dailyLogEdits, setDailyLogEdits] = useState<Record<string, DailyLog>>(
    {},
  );

  // ─── sync events from cache into local state ──────────────────────────────
  // only re-syncs when a new page is fetched (pageCount changes)
  // not on every render — avoids overwriting user edits
  const pageCount = data?.pages.length ?? 0;

  const lastSyncedUserId = useRef<string | null>(null);
  useEffect(() => {
    setEvents([]);
    setDailyLogEdits({});
    lastSyncedUserId.current = userId;
  }, [userId]);

  useEffect(() => {
    const eventsData = data?.eventsData ?? [];

    // force re-sync if userId changed even if pageCount didn't
    if (
      eventsData.length > 0 &&
      (pageCount > 0 || lastSyncedUserId.current !== userId)
    ) {
      lastSyncedUserId.current = userId;
      setEvents(
        [...eventsData].sort(
          (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
        ),
      );
    } else if (lastSyncedUserId.current !== userId) {
      lastSyncedUserId.current = userId;
      setEvents([]);
    }
  }, [pageCount, userId]);

  // ─── prefetch trigger ─────────────────────────────────────────────────────
  // when user navigates close to the oldest loaded date, fetch more
  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const oldestLoadedDate = data?.pages.at(-1)?.range.from;
    if (!oldestLoadedDate) return;
    const daysFromOldest = selectedDay.diff(oldestLoadedDate, "days").days;
    if (daysFromOldest <= CHUNK_DAYS) {
      fetchPreviousRange();
    }
  }, [selectedDay, pageCount]);

  const isLockedEvent = (event?: HosEventPayload | HosEvent | null) =>
    Boolean(event?.i);

  const toastLocked = () => {
    toast.error("Locked/inactive events cannot be changed.");
  };

  const createEvent = (event: HosEvent | HosEventPayload) => {
    if (isLockedEvent(event)) {
      toastLocked();
      return;
    }
    const newEvent: HosEvent | HosEventPayload = {
      ...event,
      _id: generateHosEventId(),
    };

    setEvents((prev) =>
      [...prev, newEvent].sort(
        (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
      ),
    );

    setStatus("pending");
    return newEvent;
  };

  const deleteEvent = (eventId: string) => {
    const target = events.find((e) => e._id === eventId);

    if (isLockedEvent(target)) {
      toastLocked();
      return;
    }

    setEvents((prev) => prev.filter((e) => e._id !== eventId));
    setStatus("pending");
  };

  const updateEvent = (
    id: string,
    updater: (event: HosEventPayload) => HosEventPayload,
  ) => {
    const target = events.find((e) => e._id === id);

    if (isLockedEvent(target)) {
      toastLocked();
      return;
    }

    setEvents((prev) =>
      sortEvents(
        prev.map((event) => (event._id === id ? updater(event) : event)),
      ),
    );

    setStatus("pending");
  };

  const updateEventsTimestamp = ({
    selectedIds,
    deltaMs,
  }: {
    selectedIds: Set<string>;
    deltaMs: number;
  }) => {
    const lockedSelected = events.some((e) => selectedIds.has(e._id) && e.i);

    if (lockedSelected) {
      toastLocked();
      return;
    }

    setEvents((prev) =>
      sortEvents(
        prev.map((e) => {
          if (!selectedIds.has(e._id)) return e;

          const newTimestamp = e.eventTime.timestamp + deltaMs;
          const newDate =
            DateTime.fromMillis(newTimestamp).toFormat("yyyy/MM/dd");

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
        }),
      ),
    );

    setStatus("pending");
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

    setStatus("pending");
  };

  // ─── summary helper ───────────────────────────────────────────────────────
  const getSummary = (date: string) =>
    data?.dailySummariesData.find((s) => s.logDate.date === date);

  // ─── transaction controls ─────────────────────────────────────────────────
  // getSavePayload diffs local events state against the cache (original snapshot)
  // and returns only what changed — this is what gets sent to the server
  const getSavePayload = () => {
    const cachedData = queryClient.getQueryData<InfiniteData<DailyLogsPage>>([
      "driverData",
      userId,
    ]);

    const originalEvents = cachedData?.pages.flatMap((p) => p.eventsData) ?? [];

    const originalLogs =
      cachedData?.pages.flatMap((p) => p.dailyLogsData) ?? [];

    const originalMap = new Map(originalEvents.map((e) => [e._id, e]));

    const currentMap = new Map(events.map((e) => [e._id, e]));

    const changedEvents = events.filter((curr) => {
      const orig = originalMap.get(curr._id);
      return JSON.stringify(orig) !== JSON.stringify(curr);
    });

    const deletedEventIds = originalEvents
      .filter((e) => !currentMap.has(e._id))
      .map((e) => e._id);

    const changedLogs = Object.entries(dailyLogEdits).map(([id, edits]) => {
      const base = originalLogs.find((l) => l._id === id);
      return { ...base, ...edits };
    });

    return {
      changedEvents,
      deletedEventIds,
      changedLogs,
    };
  };
  const savePayload = getSavePayload();
  console.log({ savePayload });
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
      concurrency: 2,
      onProgress: (p) => {
        onProgress?.({
          done: p.done,
          total: p.total,
          success: p.success,
          failed: p.failed,
          current: p.current,
          retrying: p.retrying,
        });
      },
    });

    await queryClient.refetchQueries({
      queryKey: ["driverData", userId],
    });

    const freshData = queryClient.getQueryData<InfiniteData<DailyLogsPage>>([
      "driverData",
      userId,
    ]);

    setEvents(sortEvents(freshData?.pages.flatMap((p) => p.eventsData) ?? []));
    setDailyLogEdits({});
    setStatus("idle");

    return {
      failed: [],
    };
  };

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

  // reset restores events from cache and clears all log edits
  const reset = () => {
    setStatus("idle");
    const cachedData = queryClient.getQueryData<InfiniteData<DailyLogsPage>>([
      "driverData",
      userId,
    ]);
    const originalEvents = cachedData?.pages.flatMap((p) => p.eventsData) ?? [];
    setEvents(
      [...originalEvents].sort(
        (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
      ),
    );
    setDailyLogEdits({});
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

    const certEvent: HosEventPayload = {
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

    setEvents((prev) => sortEvents([...prev, certEvent]));

    updateDailyLog(dailyLog._id, {
      signature,
    });

    setStatus("pending");
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

    const newEvents = interlocationEvents.map((iE) =>
      buildBasicEventType(iE, "LOG_NORMAL_PRECISION", generateHosEventId()),
    );

    setEvents((prev) =>
      sortEvents([
        ...prev.filter(
          (event) =>
            !(
              event._id !== selected._id &&
              event._id !== endEvent._id &&
              event.eventTime.timestamp > selected.eventTime.timestamp &&
              event.eventTime.timestamp < endEvent.eventTime.timestamp
            ),
        ),
        ...newEvents,
      ]),
    );

    setStatus("pending");
  };

  const dailyLogs = [
    ...(data?.dailyLogsData ?? []).filter((log) => !dailyLogEdits[log._id]),
    ...Object.values(dailyLogEdits),
  ];

  return {
    status,
    // per-day selectors
    getDailyLog,
    getSummary,
    getSaveStats,

    // mutable events array — use this everywhere instead of raw cache
    events,
    lastKnownEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventsTimestamp,
    setDailyLogEdits,

    // all summaries if you need to iterate (e.g. calendar view)
    summaries: data?.dailySummariesData ?? [],
    dailyLogs,

    // fetch controls
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
  };
};
