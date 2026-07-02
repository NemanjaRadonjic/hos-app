// @ts-ignore - because no types :(
import tzlookup from "tz-lookup";

export function tzLookup(location?: {
  lat?: number | null;
  lon?: number | null;
}) {
  if (location?.lat == null || location?.lon == null) {
    return null;
  }

  try {
    return tzlookup(location.lat, location.lon);
  } catch {
    return null;
  }
}
