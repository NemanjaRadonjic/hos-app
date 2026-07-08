import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { DateTime } from "luxon";
import {
  getHosEvents,
  getDailyLogs,
  getDailyLogSummaries,
  getLastKnownStatus,
} from "../api";
import type { HosEvent, DailyLog, DailyLogSummary } from "../types";
import { useCallback, useMemo } from "react";

const INITIAL_HISTORY_DAYS = 24;
export const CHUNK_DAYS = 8;

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
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["driverData", userId] as const, [userId]);

  const query = useInfiniteQuery<
    DailyLogsPage,
    Error,
    FlatDailyLogData,
    typeof queryKey,
    Range
  >({
    queryKey,

    initialPageParam: {
      from: DateTime.now().minus({ days: INITIAL_HISTORY_DAYS }).startOf("day"),
      to: DateTime.now().endOf("day"),
    },

    select: flattenDailyLogsData,

    queryFn: async ({ pageParam }) => {
      return fetchDailyLogsPage(userId, pageParam);
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

  const fetchRange = useCallback(
    async (range: Range) => {
      const rawData =
        queryClient.getQueryData<InfiniteData<DailyLogsPage, Range>>(queryKey);

      const alreadyLoaded = rawData?.pages.some((page) => {
        return range.from >= page.range.from && range.to <= page.range.to;
      });

      if (alreadyLoaded) return;

      const page = await fetchDailyLogsPage(userId, range);

      queryClient.setQueryData<InfiniteData<DailyLogsPage, Range>>(
        queryKey,
        (old) => {
          if (!old) {
            return {
              pages: [page],
              pageParams: [range],
            };
          }

          return {
            pages: [...old.pages, page],
            pageParams: [...old.pageParams, range],
          };
        },
      );
    },
    [queryClient, queryKey, userId],
  );

  return {
    ...query,
    fetchRange,
  };
};

const fetchDailyLogsPage = async (
  userId: string,
  range: Range,
): Promise<DailyLogsPage> => {
  const fmt = (d: DateTime) => d.toFormat("yyyy/MM/dd");
  const isFirstPage = range.to >= DateTime.now().startOf("day");

  const [eventsData, dailyLogsData, dailySummariesData, lastKnownEvent] =
    await Promise.all([
      getHosEvents(userId, fmt(range.from), fmt(range.to)),
      getDailyLogs(userId, fmt(range.from), fmt(range.to)),
      getDailyLogSummaries(userId, fmt(range.from), fmt(range.to)),
      isFirstPage
        ? getLastKnownStatus(userId, fmt(range.from))
        : Promise.resolve(null),
    ]);

  return {
    eventsData,
    dailyLogsData,
    dailySummariesData,
    lastKnownEvent,
    range,
  };
};
