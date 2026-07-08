type Coords = {
  lat: number;
  lon: number;
};
type KnownLocationType = "Facility" | "Yard" | "Shop";

type KnownLocation = {
  type: KnownLocationType;
  coords: Coords;
  radiusMiles?: number;
};

export const KNOWN_LOCATIONS: KnownLocation[] = [
  {
    type: "Yard",
    coords: { lat: 41.74659475298797, lon: -87.8407240759609 },
    radiusMiles: 1,
  },
  {
    type: "Shop",
    coords: { lat: 41.74147917709265, lon: -87.83481147808926 },
    radiusMiles: 1,
  },
  {
    type: "Facility",
    coords: { lat: 36.09897758719386, lon: -86.6961789916119 },
    radiusMiles: 1,
  },
];
