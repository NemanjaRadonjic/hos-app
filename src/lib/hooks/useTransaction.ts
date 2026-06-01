import { useState, useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { DateTime } from "luxon";
import type { HosEvent, DailyLog, DailyLogSummary } from "../types";
import { CHUNK_DAYS, useDailyLogsData } from "./useDailyLogData";
import { useCompany } from "./useCompany";
import { getTokenPayload } from "../helpers";
import { buildDailyLog, buildDailyLogSummary } from "../hos/helpers";
import { useDriverData } from "./useDriverData";
import { upsertDailyLog, upsertDailyLogSummary, upsertHosEvent } from "../api";

type TransactionStatus = "idle" | "pending" | "saving" | "error";

export const useTransaction = (userId: string, selectedDay: DateTime) => {
  const queryClient = useQueryClient();
  const { driver } = useDriverData(userId);
  const { data: company } = useCompany();
  console.log({ company });

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

  console.log({ data });

  const lastKnownEvent = data?.lastKnownEvent ?? null;

  // ─── local mutable state ──────────────────────────────────────────────────
  // events get copied into local state because they can be heavily mutated
  // (timestamp shifts, status changes, etc.)
  const [events, setEvents] = useState<HosEvent[]>([]);

  // dailyLogEdits is a sparse delta — only the fields that changed per log id
  const [dailyLogEdits, setDailyLogEdits] = useState<
    Record<string, Partial<DailyLog>>
  >({});
  console.log({ dailyLogEdits });

  // ─── sync events from cache into local state ──────────────────────────────
  // only re-syncs when a new page is fetched (pageCount changes)
  // not on every render — avoids overwriting user edits
  const pageCount = data?.pages.length ?? 0;

  useEffect(() => {
    setEvents([]);
    setDailyLogEdits({});
  }, [userId]); // reset everything when driver changes

  useEffect(() => {
    const eventsData = data?.eventsData ?? [];
    if (eventsData.length > 0) {
      setEvents(
        [...eventsData].sort(
          (a, b) => a.eventTime.timestamp - b.eventTime.timestamp,
        ),
      );
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

  const updateDailyLog = (id: string, changes: Partial<DailyLog>) => {
    const existing = data?.dailyLogsData.find((l) => l._id === id);
    if (!driver || !company) {
      console.log("Driver or company not available.");
      return null;
    }
    if (!existing) {
      const newLog = buildDailyLog({
        dailyLogId: id,
        driver,
        selectedDay,
        company,
      });
      setDailyLogEdits((prev) => ({
        ...prev,
        [id]: {
          ...newLog,
          ...changes,
          form: {
            ...newLog.form,
            ...(changes.form ?? {}),
          },
        },
      }));
    } else {
      setDailyLogEdits((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          ...changes,
          form: {
            ...existing.form,
            ...(prev[id]?.form ?? {}),
            ...(changes.form ?? {}),
          },
        },
      }));
    }

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

    const changedEvents = events.filter((curr) => {
      const orig = originalEvents.find((e) => e._id === curr._id);
      return JSON.stringify(orig) !== JSON.stringify(curr);
    });

    // merge each edited log with its base for full object the server expects
    const changedLogs = Object.entries(dailyLogEdits).map(([id, edits]) => {
      const base = originalLogs.find((l) => l._id === id);
      return { ...base, ...edits };
    });

    return { changedEvents, changedLogs };
  };

  const commit = async () => {
    setStatus("saving");
    const { changedEvents, changedLogs } = getSavePayload();
    console.log({ changedEvents, changedLogs });
    const failed: string[] = [];

    // daily logs
    for (const log of changedLogs) {
      const summaryId = log._id.replace("DailyLog:", "DailyLogSummary:");
      try {
        await upsertDailyLog(log._id, log);
        await upsertDailyLogSummary(
          summaryId,
          buildDailyLogSummary(
            summaryId,
            driver.id,
            log.logDate.date,
            Boolean(log),
            Boolean(log.form.signature),
          ),
        );
      } catch {
        failed.push(log._id);
      }
    }

    // events
    for (const event of changedEvents) {
      try {
        await upsertHosEvent(event._id, event);
      } catch {
        failed.push(event._id);
      }
    }

    // events (add later when endpoint is ready)
    // for (const event of changedEvents) { ... }

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
    setEvents(originalEvents);
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
    setEvents,

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
