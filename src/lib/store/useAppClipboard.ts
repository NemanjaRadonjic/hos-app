import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { HosEvent } from "../types";

type ClipboardState = {
  location?: HosEvent["location"];
  odometer?: number;
  engineHours?: number;
  eld?: HosEvent["eld"];
  vehicle?: HosEvent["vehicle"];
};

type ClipboardStore = {
  data: ClipboardState;

  copyLocation: (location: HosEvent["location"]) => void;

  copyOdometer: (value: number) => void;

  copyEngineHours: (value: number) => void;

  copyEld: (eld: HosEvent["eld"]) => void;

  copyVehicle: (vehicle: HosEvent["vehicle"]) => void;

  clear: () => void;
};

export const useAppClipboardStore = create<ClipboardStore>()(
  devtools(
    (set) => ({
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

      copyOdometer(value) {
        set((state) => ({
          data: {
            ...state.data,
            odometer: value,
          },
        }));
      },

      copyEngineHours(value) {
        set((state) => ({
          data: {
            ...state.data,
            engineHours: value,
          },
        }));
      },

      copyEld(eld) {
        if (!eld) return;

        set((state) => ({
          data: {
            ...state.data,
            eld,
          },
        }));
      },

      copyVehicle(vehicle) {
        if (!vehicle) return;

        set((state) => ({
          data: {
            ...state.data,
            vehicle,
          },
        }));
      },

      clear() {
        set({ data: {} });
      },
    }),
    { name: "Clipboard Store" },
  ),
);
