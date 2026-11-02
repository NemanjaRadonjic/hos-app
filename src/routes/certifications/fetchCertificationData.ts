import { getDailyLogs, getDailyLogSummaries, getHosEvents } from "@/lib/api";
import { DateTime } from "luxon";

export const fetchCertificationData = async (
  userId: string,
  today = DateTime.now().setZone("America/Chicago").startOf("day"),
) => {
  const yesterday = today.minus({ days: 1 });
  const twoDaysAgo = today.minus({ days: 2 });

  const fmt = (date: DateTime) => date.toFormat("yyyy/MM/dd");

  const from = fmt(yesterday);
  const to = fmt(today);
  const dailyLogsFrom = fmt(twoDaysAgo);

  const [eventsData, dailyLogsData, dailySummariesData] = await Promise.all([
    getHosEvents(userId, from, to),
    getDailyLogs(userId, dailyLogsFrom, to),
    getDailyLogSummaries(userId, from, to),
  ]);

  return {
    eventsData,
    dailyLogsData,
    dailySummariesData,
    from,
    to,
  };
};
