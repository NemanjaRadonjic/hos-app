import { STATE_NAMES } from "../maps";
import cities from "../places_us.json";

interface CityDataRaw {
  City: string;
  State: string;
  Lat: string;
  Lon: string;
}

interface City {
  name: string;
  state: string;
  lat: number;
  lon: number;
}

function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // miles
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function bearingDirection(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  return directions[Math.round(brng / 22.5) % 16];
}

function findNearestCity(lat: number, lon: number) {
  let best: City | null = null;
  let bestDistance = Infinity;

  for (const raw of cities as CityDataRaw[]) {
    const lat2 = Number(raw.Lat);
    const lon2 = Number(raw.Lon);

    if (Number.isNaN(lat2) || Number.isNaN(lon2)) continue;

    const dist = distanceMiles(lat, lon, lat2, lon2);

    if (dist < bestDistance) {
      bestDistance = dist;
      best = {
        name: raw.City,
        state: raw.State,
        lat: lat2,
        lon: lon2,
      };
    }
  }

  return { city: best, distance: bestDistance };
}

export function getCalculatedLocationData(lat: number, lon: number) {
  const { city, distance } = findNearestCity(lat, lon);

  if (!city) {
    return {
      calculatedLocation: "",
      state: "",
    };
  }

  const miles = Math.round(distance);

  if (miles <= 1) {
    return {
      calculatedLocation: `${city.name}, ${city.state}`,
      state: STATE_NAMES[city.state],
    };
  }

  const direction = bearingDirection(lat, lon, city.lat, city.lon);

  return {
    calculatedLocation: `${miles}mi ${direction} from ${city.name}, ${city.state}`,
    state: STATE_NAMES[city.state],
  };
}

export function getStateFromCalculatedLocation(location?: string | null) {
  return location?.match(/,\s*([A-Z]{2})$/)?.[1] ?? null;
}
