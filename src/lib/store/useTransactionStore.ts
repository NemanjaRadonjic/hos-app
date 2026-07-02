import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { DailyLog, HosEvent, HosEventLocal } from "@/lib/types";
import { sortEvents } from "../helpers/sort-events";

type TransactionStatus = "idle" | "pending" | "saving" | "error";

type TransactionStore = {
  status: TransactionStatus;
  events: HosEventLocal[];
  dailyLogEdits: Record<string, DailyLog>;

  setStatus: (status: TransactionStatus) => void;
  setEvents: (events: HosEventLocal[]) => void;
  //   setDailyLogEdits: (edits: Record<string, DailyLog>) => void;

  //   updateEvent: (id: string, updater: (event: HosEvent) => HosEvent) => void;
  //   deleteEvent: (id: string) => void;

  //   resetLocal: () => void;
};

export const useTransactionStore = create<TransactionStore>()(
  devtools((set) => ({
    status: "idle",
    events: [],
    dailyLogEdits: {},

    setStatus: (status) => set({ status }, false, "transaction/setStatus"),
    setEvents: (events) =>
      set({ events: sortEvents(events) }, false, "transaction/setEvents"),
  })),
);
