import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { getCalculatedLocationData } from "../helpers/get-calculated-location";
import type { HosEvent } from "../types";

type ClipboardLocation = {
  lat: number;
  lon: number;
  calculatedLocation: string;
  state: string;
};

type ClipboardState = {
  coordinates?: {
    lat: number;
    lon: number;
  };
  location?: ClipboardLocation;

  odometer?: number;
  engineHours?: number;
};

type ClipboardStore = {
  data: ClipboardState;

  copyLocation: (location: HosEvent["location"]) => Promise<void>;
  resolveLocation(): Promise<ClipboardLocation | undefined>;
  canPasteLocation: () => Promise<boolean>;
  copyOdometer: (value: number) => Promise<void>;
  copyEngineHours: (value: number) => Promise<void>;

  clear: () => void;
};

export const useAppClipboardStore = create<ClipboardStore>()(
  devtools(
    (set, get) => ({
      data: {},

      async copyLocation(location) {
        if (!location) return;
        const coordinates = {
          lat: location.lat,
          lon: location.lon,
        };

        set((state) => ({
          data: {
            ...state.data,
            coordinates,
            location,
          },
        }));

        await navigator.clipboard.writeText(
          `${coordinates.lat},${coordinates.lon}`,
        );
      },

      async resolveLocation() {
        const clipboardText = await navigator.clipboard.readText();

        const coordinates = parseCoordinates(clipboardText);

        if (coordinates) {
          const { calculatedLocation, state } = getCalculatedLocationData(
            coordinates.lat,
            coordinates.lon,
          );

          const location = {
            lat: coordinates.lat,
            lon: coordinates.lon,
            calculatedLocation,
            state,
          };

          set((prev) => ({
            data: {
              ...prev.data,
              coordinates,
              location,
            },
          }));

          return location;
        }

        // fallback to internal app clipboard
        const storedLocation = get().data.location;

        if (storedLocation) {
          return storedLocation;
        }

        return undefined;
      },
      canPasteLocation: async () => {
        const { coordinates, location } = get().data;

        if (location || coordinates) {
          return true;
        }

        try {
          const text = await navigator.clipboard.readText();

          const coords = parseCoordinates(text);

          return !!coords;
        } catch {
          return false;
        }
      },
      async copyOdometer(value) {
        set((state) => ({
          data: {
            ...state.data,
            odometer: value,
          },
        }));

        await navigator.clipboard.writeText(value.toString());
      },

      async copyEngineHours(value) {
        set((state) => ({
          data: {
            ...state.data,
            engineHours: value,
          },
        }));

        await navigator.clipboard.writeText(value.toString());
      },

      clear() {
        set({ data: {} });
      },
    }),
    { name: "Clipboard Store" },
  ),
);

function parseCoordinates(text: string) {
  const parts = text.split(",").map(Number);

  if (parts.length !== 2) {
    return undefined;
  }

  const [lat, lon] = parts;

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return undefined;
  }

  return {
    lat,
    lon,
  };
}
