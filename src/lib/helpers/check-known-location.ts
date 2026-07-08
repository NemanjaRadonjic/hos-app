import { distanceMiles } from "../hooks/helpers/build-interlocations";
import { KNOWN_LOCATIONS } from "../maps/known-locations";

type Coords = {
  lat: number;
  lon: number;
};

export function checkKnownLocation(coords: Coords | null | undefined) {
  if (!coords) return null;

  let bestMatch: {
    location: (typeof KNOWN_LOCATIONS)[number];
    distanceMiles: number;
  } | null = null;

  for (const location of KNOWN_LOCATIONS) {
    const distance = distanceMiles(
      { lat: coords.lat, lng: coords.lon },
      { lat: location.coords.lat, lng: location.coords.lon },
    );

    const radiusMiles = location.radiusMiles ?? 1;

    if (distance <= radiusMiles) {
      if (!bestMatch || distance < bestMatch.distanceMiles) {
        bestMatch = {
          location,
          distanceMiles: distance,
        };
      }
    }
  }

  return bestMatch;
}
