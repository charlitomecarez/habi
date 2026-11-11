// Pure Places rules, shared by the app, the places-nearby function and their tests.
// The phone sends only an area of about 5 km. It counts the distance to each place itself.

export const CATEGORIES = ["sights", "food", "parks", "shopping"] as const;
export type PlaceCategory = (typeof CATEGORIES)[number];

/** The area step in degrees: 0.05 is about 5.5 km in the Philippines. */
export const CELL_STEP = 0.05;
export const RADIUS_M = 10_000;
export const MAX_PLACES = 20;
export const FRESH_HOURS = 24;
export const KEEP_DAYS = 7;

export const CELL = /^-?\d{1,2}\.\d{2}:-?\d{1,3}\.\d{2}$/;

/** "14.65:121.05": latitude and longitude, each rounded to the nearest 0.05. */
export function toCell(latitude: number, longitude: number): string {
  const round = (v: number) => (Math.round(v / CELL_STEP) * CELL_STEP).toFixed(2).replace("-0.00", "0.00");
  return `${round(latitude)}:${round(longitude)}`;
}

export function cellCenter(cell: string): { latitude: number; longitude: number } {
  const [latitude, longitude] = cell.split(":").map(Number);
  return { latitude, longitude };
}

/** The Geoapify categories for each kind of place. */
export const GEOAPIFY_CATEGORIES: Record<PlaceCategory, string> = {
  sights: "tourism.sights,tourism.attraction,entertainment.museum,entertainment.culture",
  food: "catering.restaurant,catering.cafe,catering.fast_food,catering.food_court",
  parks: "leisure.park,national_park,natural.protected_area,natural.forest",
  shopping: "commercial.shopping_mall,commercial.marketplace,commercial.department_store",
};

export type NearbyPlace = { name: string; kind: string; latitude: number; longitude: number };

export type GeoapifyFeature = {
  properties: { name?: string; lat?: number; lon?: number; categories?: string[] };
};

const WORDS: Record<string, string> = {
  shopping_mall: "Mall",
  marketplace: "Market",
  fast_food: "Fast food",
  food_court: "Food court",
};

/** A short word for the kind of place, from its most exact Geoapify category: "Museum", "Park", "Cafe". */
export function kindWord(categories: readonly string[], category: PlaceCategory): string {
  const wanted = GEOAPIFY_CATEGORIES[category].split(",");
  const match = [...categories]
    .filter((c) => wanted.some((w) => c === w || c.startsWith(`${w}.`)))
    .sort((a, b) => b.split(".").length - a.split(".").length)[0];
  const last = (match ?? wanted[0]).split(".").at(-1)!;
  const word = WORDS[last] ?? last.replace(/_/g, " ");
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** Named places only, at most 20. */
export function parseGeoapify(features: readonly GeoapifyFeature[], category: PlaceCategory): NearbyPlace[] {
  return features
    .filter((f) => f.properties.name && typeof f.properties.lat === "number" && typeof f.properties.lon === "number")
    .slice(0, MAX_PLACES)
    .map((f) => ({
      name: f.properties.name!,
      kind: kindWord(f.properties.categories ?? [], category),
      latitude: f.properties.lat!,
      longitude: f.properties.lon!,
    }));
}

/** The distance in km between two points, on a sphere. */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
