import api from "./axios";
import type {
  DailyLogChange,
  EventChange,
  TransactionEvent,
} from "./hooks/useTransaction";
import { supabase } from "./supabase";
import type { DailyLog, DailyLogSummary, HosEvent } from "./types";

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

export const upsertHosEvent = async (id: string, payload: HosEvent) => {
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

type Point = {
  lat: number;
  lng: number;
};

export const generateInterlocations = async ({
  start,
  end,
}: {
  start: Point;
  end: Point;
}) => {
  const { data, error } = await supabase.functions.invoke(
    "generate_interlocations",
    {
      body: { start, end },
    },
  );

  if (error) {
    console.error(error);
    return null;
  }

  return data;
};

export const createTransaction = async ({
  driverId,
  fromDate,
  toDate,
  eventChanges,
  logChanges,
  transactionEvents,
  maxTimeShiftMs,
}: {
  driverId: string;
  fromDate: string;
  toDate: string;
  eventChanges: EventChange[];
  logChanges: DailyLogChange[];
  transactionEvents: TransactionEvent[];
  maxTimeShiftMs: number;
}) => {
  const addedEventCount = eventChanges.filter(
    (change) => change.operation === "create",
  ).length;

  const updatedEventCount = eventChanges.filter(
    (change) => change.operation === "update",
  ).length;

  const deletedEventCount = eventChanges.filter(
    (change) => change.operation === "delete",
  ).length;

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      driver_id: driverId,

      from_date: fromDate.replaceAll("/", "-"),
      to_date: toDate.replaceAll("/", "-"),

      event_change_count: eventChanges.length,
      log_change_count: logChanges.length,

      added_event_count: addedEventCount,
      updated_event_count: updatedEventCount,
      deleted_event_count: deletedEventCount,

      max_time_shift_ms: maxTimeShiftMs,

      transaction_events: transactionEvents,
      log_changes: logChanges,

      status: "pending",
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateTransaction = async (
  id: string,
  updates: {
    status?: "pending" | "success" | "partial_failure" | "failed";
  },
) => {
  const { error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
};

type GetTransactionsOptions = {
  pageIndex: number;
  pageSize: number;
  driverId?: string;
};

export async function getTransactions({
  pageIndex,
  pageSize,
  driverId,
}: GetTransactionsOptions) {
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("transactions").select("*", { count: "exact" });

  if (driverId) {
    query = query.eq("driver_id", driverId);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  return {
    transactions: data ?? [],
    rowCount: count ?? 0,
  };
}

export const getTransaction = async (id: string) => {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
};
