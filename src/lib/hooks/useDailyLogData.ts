import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { DateTime } from "luxon";
import {
  getHosEvents,
  getDailyLogs,
  getDailyLogSummaries,
  getLastKnownStatus,
} from "../api";
import type { HosEvent, DailyLog, DailyLogSummary } from "../types";

const INITIAL_HISTORY_DAYS = 24;
export const CHUNK_DAYS = 10;

export type Range = { from: DateTime; to: DateTime };

type DailyLogsPage = {
  eventsData: HosEvent[];
  dailyLogsData: DailyLog[];
  dailySummariesData: DailyLogSummary[];
  range: Range;
  lastKnownEvent: HosEvent | null;
};

type FlatDailyLogData = {
  pages: DailyLogsPage[];
  pageParams: Range[];
  eventsData: HosEvent[];
  dailyLogsData: DailyLog[];
  dailySummariesData: DailyLogSummary[];
  lastKnownEvent: HosEvent | null;
};

export const flattenDailyLogsData = (
  data?: InfiniteData<DailyLogsPage, Range>,
): FlatDailyLogData => ({
  pages: data?.pages ?? [],
  pageParams: data?.pageParams ?? [],
  eventsData: [
    ...new Map(
      (data?.pages ?? []).flatMap((p) => p.eventsData).map((e) => [e._id, e]),
    ).values(),
  ],
  dailyLogsData: [
    ...new Map(
      (data?.pages ?? [])
        .flatMap((p) => p.dailyLogsData)
        .map((l) => [l._id, l]),
    ).values(),
  ],
  dailySummariesData: [
    ...new Map(
      (data?.pages ?? [])
        .flatMap((p) => p.dailySummariesData)
        .map((s) => [s._id, s]),
    ).values(),
  ],
  lastKnownEvent: data?.pages[0]?.lastKnownEvent ?? null,
});

export const useDailyLogsData = (userId: string, selectedDay: DateTime) => {
  return useInfiniteQuery<
    DailyLogsPage,
    Error,
    FlatDailyLogData,
    [string, string],
    Range
  >({
    queryKey: ["driverData", userId],

    initialPageParam: {
      from: DateTime.now().minus({ days: INITIAL_HISTORY_DAYS }).startOf("day"),
      to: DateTime.now().endOf("day"),
    },

    select: flattenDailyLogsData,

    queryFn: async ({ pageParam }) => {
      const fmt = (d: DateTime) => d.toFormat("yyyy/MM/dd");
      const isFirstPage = pageParam.to >= DateTime.now().startOf("day");

      const [eventsData, dailyLogsData, dailySummariesData, lastKnownEvent] =
        await Promise.all([
          getHosEvents(userId, fmt(pageParam.from), fmt(pageParam.to)),
          getDailyLogs(userId, fmt(pageParam.from), fmt(pageParam.to)),
          getDailyLogSummaries(userId, fmt(pageParam.from), fmt(pageParam.to)),
          isFirstPage
            ? getLastKnownStatus(userId, fmt(pageParam.from))
            : Promise.resolve(null),
        ]);

      return {
        eventsData: eventsData.length > 0 ? eventsData : [],
        lastKnownEvent: lastKnownEvent,
        dailyLogsData,
        dailySummariesData,
        range: pageParam,
      };
    },

    getNextPageParam: (lastPage) => {
      const nextTo = lastPage.range.from.minus({ days: 1 });
      return {
        from: nextTo.minus({ days: CHUNK_DAYS }),
        to: nextTo,
      };
    },

    staleTime: Infinity,
  });
};
