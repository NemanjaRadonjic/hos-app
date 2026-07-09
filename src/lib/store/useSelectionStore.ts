// src/lib/stores/useSelectionStore.ts
import { create } from "zustand";
import { toast } from "sonner";
import type { HosEvent } from "@/lib/types";
import type { DateTime } from "luxon";
import { devtools } from "zustand/middleware";

type SliderSelection = {
  start: number;
  end: number;
};

type SelectionStore = {
  selectedIds: Set<string>;

  sliderSelection: SliderSelection;
  sliderActive: boolean;

  setSelectedIds: (ids: Set<string>) => void;
  setSelection: (ids: Iterable<string>, selectableEvents: HosEvent[]) => void;
  toggleSelectedId: (id: string, selectableEvents: HosEvent[]) => void;
  resetSelection: () => void;

  setSliderSelection: (
    sliderSelection: any,
    options?:
      | {
          selectedDay: DateTime<boolean>;
          selectableEvents: HosEvent[];
        }
      | undefined,
  ) => void;
  setSliderActive: (active: boolean) => void;
};

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    (set, get) => ({
      selectedIds: new Set(),

      sliderSelection: { start: 0, end: 0 },
      sliderActive: false,

      setSelectedIds: (ids) => {
        set({ selectedIds: ids });
      },

      setSelection: (ids, selectableEvents) => {
        const next = new Set(ids);

        const blocked = selectableEvents.some((e) => e.i && next.has(e._id));

        if (blocked) {
          toast.error("Locked events cannot be selected.");
          return;
        }

        set({ selectedIds: next });
      },

      toggleSelectedId: (id, selectableEvents) => {
        const next = new Set(get().selectedIds);

        next.has(id) ? next.delete(id) : next.add(id);

        const blocked = selectableEvents.some((e) => e.i && next.has(e._id));

        if (blocked) {
          toast.error("Locked events cannot be selected.");
          return;
        }

        set({ selectedIds: next });
      },

      resetSelection: () => {
        set({ selectedIds: new Set() });
        set({
          sliderSelection: { start: 0, end: 0 },
          sliderActive: false,
        });
      },

      setSliderSelection: (
        sliderSelection,
        options?: {
          selectedDay: DateTime;
          selectableEvents: HosEvent[];
        },
      ) => {
        if (!options) {
          set({ sliderSelection });
          return;
        }

        const start = Math.min(sliderSelection.start, sliderSelection.end);
        const end = Math.max(sliderSelection.start, sliderSelection.end);

        const startTs =
          options.selectedDay.startOf("day").toMillis() + start * 60_000;
        const endTs =
          options.selectedDay.startOf("day").toMillis() + end * 60_000;

        const selectedIds = new Set(
          options.selectableEvents
            .filter((event) => {
              const ts = event.eventTime.timestamp;
              return ts >= startTs && ts <= endTs;
            })
            .map((event) => event._id),
        );

        set({
          sliderSelection,
          selectedIds,
        });
      },

      setSliderActive: (sliderActive) => {
        set({ sliderActive });
      },
    }),
    { name: "Selection store" },
  ),
);
