type Point = {
  lat: number;
  lng: number;
};

const MILES_PER_METER = 0.000621371;
const HOUR_MS = 60 * 60 * 1000;

function splitOdometerWeighted({
  totalMiles,
  weights,
  variation = 0.04,
}: {
  totalMiles: number;
  weights: number[];
  variation?: number;
}) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const raw = weights.map((weight) => {
    const base = totalMiles * (weight / totalWeight);
    const randomFactor = 1 + (Math.random() * 2 - 1) * variation;
    return base * randomFactor;
  });

  const rawTotal = raw.reduce((sum, value) => sum + value, 0);

  return raw.map((value) => (value / rawTotal) * totalMiles);
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function distanceMiles(a: Point, b: Point) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h)) * MILES_PER_METER;
}

function getCumulativeDistances(coords: Point[]) {
  const distances = [0];

  for (let i = 1; i < coords.length; i++) {
    distances[i] = distances[i - 1] + distanceMiles(coords[i - 1], coords[i]);
  }

  return distances;
}

function findCoordinateAtMiles({
  routeCoordinates,
  distances,
  targetMiles,
}: {
  routeCoordinates: Point[];
  distances: number[];
  targetMiles: number;
}) {
  const index = distances.findIndex((d) => d >= targetMiles);

  return routeCoordinates[index === -1 ? routeCoordinates.length - 1 : index];
}

export function buildInterlocations({
  routeCoordinates,
  startTs,
  endTs,
  startOdometer,
  endOdometer,
}: {
  routeCoordinates: Point[];
  startTs: number;
  endTs: number;
  startOdometer: number;
  endOdometer: number;
}) {
  const durationMs = endTs - startTs;
  if (durationMs <= HOUR_MS) return [];
  if (routeCoordinates.length === 0) return [];

  const odometerDelta = endOdometer - startOdometer;
  if (odometerDelta <= 0) return [];

  const distances = getCumulativeDistances(routeCoordinates);
  const routeMiles = distances.at(-1) ?? 0;
  if (routeMiles <= 0) return [];

  const timestamps: number[] = [];

  for (let ts = startTs + HOUR_MS; ts < endTs; ts += HOUR_MS) {
    timestamps.push(ts);
  }

  const boundaries = [startTs, ...timestamps, endTs];

  const weights = boundaries.slice(1).map((ts, i) => ts - boundaries[i]);

  const odometerSteps = splitOdometerWeighted({
    totalMiles: odometerDelta,
    weights,
    variation: 0.04,
  });

  const points = [];
  let milesFromStart = 0;

  for (
    let timestamp = startTs + HOUR_MS, i = 0;
    timestamp < endTs;
    timestamp += HOUR_MS, i++
  ) {
    milesFromStart += odometerSteps[i];

    const routeTargetMiles = routeMiles * (milesFromStart / odometerDelta);

    const location = findCoordinateAtMiles({
      routeCoordinates,
      distances,
      targetMiles: routeTargetMiles,
    });

    points.push({
      timestamp,
      location,
      odometer: Math.round(startOdometer + milesFromStart),
    });
  }

  return points;
}
