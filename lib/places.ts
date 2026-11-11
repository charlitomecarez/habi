import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Linking } from "react-native";

import { supabase } from "@/lib/supabase";
import type { TripItemKind } from "@/lib/travel";
import {
  CATEGORIES,
  distanceKm,
  toCell,
  type NearbyPlace,
  type PlaceCategory,
} from "@/supabase/functions/_shared/places";

export { CATEGORIES, toCell, type NearbyPlace, type PlaceCategory };

// Places near you. The phone keeps your exact spot: it sends places-nearby only the area of about
// 5 km, and it counts each distance itself. Place search in a trip item calls Photon from the phone,
// as Weather calls its place search.

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  sights: "Sights",
  food: "Food",
  parks: "Parks",
  shopping: "Shopping",
};

/** The trip item kind for a place: Food is Eat, Shopping is Other, and Sights and Parks are Go. */
export const ITEM_KIND: Record<PlaceCategory, TripItemKind> = {
  sights: "go",
  food: "eat",
  parks: "go",
  shopping: "other",
};

export type Coords = { latitude: number; longitude: number };
export type PlaceWithDistance = NearbyPlace & { km: number };

/** Nearest first, within 10 km. */
export function withDistance(places: readonly NearbyPlace[], from: Coords): PlaceWithDistance[] {
  return places
    .map((p) => ({ ...p, km: distanceKm(from, p) }))
    .filter((p) => p.km <= 10)
    .sort((a, b) => a.km - b.km);
}

/** "1.2 km", or "800 m" under 1 km. */
export function distanceText(km: number): string {
  return km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m` : `${km.toFixed(1)} km`;
}

/** A Google Maps link to the exact point. It needs no key. */
export function placeMapUrl(p: Coords & { name: string }): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
}

export const openInMaps = (p: Coords & { name: string }) => Linking.openURL(placeMapUrl(p));

async function functionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body?.error) return body.error;
  }
  return "Could not load places. Check your connection, then try again.";
}

/** The places of one kind near you. Only the area leaves the phone; the query key holds no spot. */
export function useNearbyPlaces(coords: Coords | null, category: PlaceCategory) {
  const cell = coords ? toCell(coords.latitude, coords.longitude) : null;
  return useQuery({
    queryKey: ["places", cell, category],
    enabled: cell !== null,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<NearbyPlace[]> => {
      const { data, error } = await supabase.functions.invoke<{ places: NearbyPlace[] }>("places-nearby", {
        body: { cell, category },
      });
      if (error) throw new Error(await functionError(error));
      return data?.places ?? [];
    },
  });
}

/** Saves a place in a trip's Ideas: a trip item with no day. */
export function useSaveIdea() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      place,
      category,
    }: {
      tripId: string;
      place: NearbyPlace;
      category: PlaceCategory;
    }) => {
      const { error } = await supabase.from("trip_items").insert({
        trip_id: tripId,
        kind: ITEM_KIND[category],
        title: place.name,
        day: null,
        place: place.name,
        map_url: placeMapUrl(place),
        currency: "PHP",
      });
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["travel"] }),
  });
}

export type PlaceSuggestion = { name: string; detail: string; mapUrl: string };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; street?: string; city?: string; county?: string; state?: string; country?: string };
};

/** Up to 5 places that match the text, from Photon. Names that repeat with the same detail show once. */
export function photonSuggestions(features: readonly PhotonFeature[]): PlaceSuggestion[] {
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const f of features) {
    const p = f.properties;
    if (!p.name) continue;
    const detail =
      [p.street, p.city ?? p.county, p.city ? null : p.state].filter(Boolean).join(", ") || (p.country ?? "");
    const key = `${p.name}|${detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const [longitude, latitude] = f.geometry.coordinates;
    out.push({ name: p.name, detail, mapUrl: placeMapUrl({ name: p.name, latitude, longitude }) });
    if (out.length === 5) break;
  }
  return out;
}

/** Photon finds a place by name. The Philippines first, by a point in the middle of the country. */
export async function searchPhoton(text: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const query = new URLSearchParams({ q: text, limit: "10", lang: "en", lat: "12.88", lon: "121.77" });
  const res = await fetch(`https://photon.komoot.io/api/?${query}`, { signal });
  if (!res.ok) throw new Error("Could not search places.");
  const json = (await res.json()) as { features?: PhotonFeature[] };
  return photonSuggestions(json.features ?? []);
}
