import api from "./axios";
import type {
  DailyLog,
  DailyLogSummary,
  HosEvent,
  HosEventPayload,
} from "./types";

export const getUsers = async () => {
  const { data } = await api.get("/users");
  return data.data;
};

export const getVehicles = async () => {
  const { data } = await api.get("/vehicles");
  return data.data;
};

export const getLatestDriverStatuses = async () => {
  const { data } = await api.get("/latest_driver_statuses?");
  return data.data;
};

export const getUser = async (userId: string) => {
  const { data } = await api.get(`/users/${userId}`);
  return data;
};

export const getHosEvents = async (
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<HosEvent[]> => {
  const params = new URLSearchParams({
    userId: `!*~${userId}`,
    "eventTime.logDate.date[$lte]": toDate,
    "eventTime.logDate.date[$gte]": fromDate,
  });

  const { data } = await api.get(`/hos_events?${params.toString()}`);
  return data.data;
};

export const getDailyLogs = async (
  userId: string,
  fromDate: string,
  toDate: string,
) => {
  const { data } = await api.get(`/daily_logs`, {
    params: {
      userId,

      "logDate.date[$lte]": toDate,
      "logDate.date[$gte]": fromDate,
    },
  });
  return data.data;
};

export const getDailyLogSummaries = async (
  userId: string,
  fromDate: string,
  toDate: string,
) => {
  const { data } = await api.get("/daily_log_summaries", {
    params: {
      "$sort[0|type.id]": -1,
      "$sort[1|companyId]": -1,
      "$sort[2|userId]": -1,
      "$sort[3|logDate.date]": -1,

      userId: `!*~${userId}`,

      "logDate.date[$lte]": toDate,
      "logDate.date[$gte]": fromDate,
    },
  });

  return data.data;
};

export const getLastKnownEventCode = async (
  userId: string,
  eventCode: string,
  beforeDate: string,
) => {
  const { data } = await api.get("hos_events", {
    params: {
      userId,
      $limit: 1,
      "$sort[0|eventTime.logDate.date]": -1,
      "$sort[1|eventTime.timestamp]": -1,
      "eventTime.logDate.date[$lt]": beforeDate,
      "recordStatus.id": "!*~ACTIVE",
      "eventCode.id": `!*~${eventCode}`,
    },
  });

  return data;
};

const LAST_STATUS_CODES = [
  "DR_IND_PC",
  "DR_IND_YM",
  "DS_ON",
  "DS_D",
  "DS_OFF",
  "DS_SB",
];

export async function getLastKnownStatus(
  userId: string,
  beforeDate: string,
): Promise<HosEvent | null> {
  const results = await Promise.all(
    LAST_STATUS_CODES.map((eventCode) =>
      getLastKnownEventCode(userId, eventCode, beforeDate),
    ),
  );

  const candidates = results
    .flatMap((r) => r.data)
    .filter(Boolean)
    .sort((a, b) => b.eventTime.timestamp - a.eventTime.timestamp);

  return candidates[0] ?? null;
}

// SERVER

export const upsertDailyLog = async (id: string, payload: DailyLog) => {
  const { data } = await api.put(`/daily_logs/${id}`, payload, {
    params: {
      "$client[ignoreRev]": true,
      "$client[createIfNotExist]": true,
      "$client[useServerAuditTime]": true,
    },
  });
  return data;
};

export const upsertDailyLogSummary = async (
  id: string,
  payload: Partial<DailyLogSummary>,
) => {
  const { data } = await api.put(`/daily_log_summaries/${id}`, payload, {
    params: {
      "$client[ignoreRev]": true,
      "$client[createIfNotExist]": true,
      "$client[useServerAuditTime]": true,
    },
  });
  return data;
};

export const upsertHosEvent = async (id: string, payload: HosEventPayload) => {
  const { data } = await api.put(`/hos_events/${id}`, payload, {
    params: {
      "$client[ignoreRev]": true,
      "$client[createIfNotExist]": true,
      "$client[useServerAuditTime]": true,
    },
  });
  return data;
};

export const deleteHosEvent = async (id: string) => {
  const { data } = await api.delete(`/hos_events/${id}`);
  return data;
};
