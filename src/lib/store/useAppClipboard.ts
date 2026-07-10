import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { HosEvent } from "../types";

type ClipboardState = {
  location?: HosEvent["location"];
  odometer?: number;
  engineHours?: number;
};

type ClipboardStore = {
  data: ClipboardState;

  copyLocation: (location: HosEvent["location"]) => void;
  getLocation: () => HosEvent["location"] | undefined;
  canPasteLocation: () => boolean;

  copyOdometer: (value: number) => void;
  getOdometer: () => number | undefined;
  canPasteOdometer: () => boolean;

  copyEngineHours: (value: number) => void;
  getEngineHours: () => number | undefined;
  canPasteEngineHours: () => boolean;

  clear: () => void;
};

export const useAppClipboardStore = create<ClipboardStore>()(
  devtools(
    (set, get) => ({
      data: {},

      copyLocation(location) {
        if (!location) return;

        set((state) => ({
          data: {
            ...state.data,
            location,
          },
        }));
      },

      getLocation() {
        return get().data.location;
      },

      canPasteLocation() {
        return !!get().data.location;
      },

      copyOdometer(value) {
        set((state) => ({
          data: {
            ...state.data,
            odometer: value,
          },
        }));
      },

      getOdometer() {
        return get().data.odometer;
      },

      canPasteOdometer() {
        return get().data.odometer != null;
      },

      copyEngineHours(value) {
        set((state) => ({
          data: {
            ...state.data,
            engineHours: value,
          },
        }));
      },

      getEngineHours() {
        return get().data.engineHours;
      },

      canPasteEngineHours() {
        return get().data.engineHours != null;
      },

      clear() {
        set({ data: {} });
      },
    }),
    { name: "Clipboard Store" },
  ),
);
