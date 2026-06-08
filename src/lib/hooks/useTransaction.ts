import { useState, useEffect, useRef } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { DateTime } from "luxon";
import type {
  HosEvent,
  DailyLog,
  DailyLogSummary,
  DailyLogForm,
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
  upsertDailyLog,
  upsertDailyLogSummary,
  upsertHosEvent,
} from "../api";
import { sortEvents } from "../helpers/sort-events";

function stripNulls<T extends Record<string, any>>(
  obj: T,
): { [K in keyof T]: Exclude<T[K], null | undefined> } {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v != null),
  ) as any;
}

type TransactionStatus = "idle" | "pending" | "saving" | "error";

export const useTransaction = (userId: string, selectedDay: DateTime) => {
  const queryClient = useQueryClient();
  const { driver } = useDriverData(userId);
  const { data: company } = useCompany();

  const [status, setStatus] = useState<TransactionStatus>("idle");
  console.log({ status });
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
  const [events, setEvents] = useState<HosEvent[]>([]);
  console.log({ events });
  // dailyLogEdits is a sparse delta — only the fields that changed per log id
  const [dailyLogEdits, setDailyLogEdits] = useState<
    Record<string, Partial<DailyLog>>
  >({});
  console.log({ dailyLogEdits });

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

  const createEvent = (event: Omit<HosEvent, "_id">) => {
    const newEvent: HosEvent = {
      ...event,
      _id: generateHosEventId(),
    };

    setEvents((prev) =>
      [...prev, newEvent].sort(
        (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
      ),
    );

    setStatus("pending");
  };

  const deleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e._id !== eventId));
  };

  const updateEvent = (id: string, updater: (event: HosEvent) => HosEvent) => {
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
    setEvents((prev) =>
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
    );
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

  const commit = async () => {
    setStatus("saving");
    const { changedEvents, changedLogs, deletedEventIds } = getSavePayload();
    console.log({ changedEvents, changedLogs, deletedEventIds });
    const failed: string[] = [];

    // daily logs
    for (const log of changedLogs) {
      const summaryId = log._id.replace("DailyLog:", "DailyLogSummary:");
      try {
        await upsertDailyLog(log._id, log);
        const existingSummary = getSummary(log.logDate.date);

        // const hasForms =
        //   log.form.vehicle ||
        //   log.form.signature ||
        //   log.form.shippingDocuments.length ||
        //   log.form.trailers.length;

        // if i want full control over the form dive into this, but not neede rn

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
        console.log({ summary });
        await upsertDailyLogSummary(summaryId, summary);
      } catch {
        failed.push(log._id);
      }
    }

    events;
    for (const event of changedEvents) {
      try {
        await upsertHosEvent(event._id, event);
      } catch {
        failed.push(event._id);
      }
    }

    for (const id of deletedEventIds) {
      try {
        await deleteHosEvent(id);
      } catch {
        failed.push(id);
      }
    }

    if (failed.length > 0) {
      setStatus("error");
      // rollback failed log edits
      setDailyLogEdits((prev) => {
        const next = { ...prev };
        failed.forEach((id) => delete next[id]);
        return next;
      });
    } else {
      setStatus("idle");
      setDailyLogEdits({});
      await queryClient.refetchQueries({ queryKey: ["driverData", userId] });
    }
  };

  // reset restores events from cache and clears all log edits
  const reset = () => {
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

  return {
    status,
    // per-day selectors
    getDailyLog,
    getSummary,

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

    // fetch controls
    fetchPreviousRange,
    hasMore,
    isFetchingMore,

    // transaction
    getSavePayload,
    reset,
    updateDailyLog,
    commit,
  };
};
