import { FunctionsHttpError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  distanceText,
  ITEM_KIND,
  openInMaps,
  photonSuggestions,
  placeMapUrl,
  searchPhoton,
  useNearbyPlaces,
  useSaveIdea,
  withDistance,
} from "@/lib/places";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
const linking = vi.hoisted(() => ({ openURL: vi.fn(async () => true) }));
vi.mock("react-native", () => ({ Linking: linking }));

const here = { latitude: 14.6515, longitude: 121.0493 };
const circle = { name: "Quezon Memorial Circle", kind: "Park", latitude: 14.6515, longitude: 121.0602 };
const far = { name: "Far", kind: "Park", latitude: 15.5, longitude: 121.0 };
const fetchMock = vi.fn();

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("distances", () => {
  it("keeps places within 10 km, nearest first", () => {
    const list = withDistance([far, circle, { ...circle, name: "Here", longitude: 121.0494 }], here);
    expect(list.map((p) => p.name)).toEqual(["Here", "Quezon Memorial Circle"]);
    expect(list[1].km).toBeCloseTo(1.2, 1);
  });

  it("writes a distance in m or km", () => {
    expect(distanceText(0.004)).toBe("10 m");
    expect(distanceText(0.84)).toBe("840 m");
    expect(distanceText(1.234)).toBe("1.2 km");
  });

  it("maps each kind to a trip item kind, and opens Maps at the point", async () => {
    expect(ITEM_KIND).toEqual({ sights: "go", food: "eat", parks: "go", shopping: "other" });
    expect(placeMapUrl(circle)).toBe("https://www.google.com/maps/search/?api=1&query=14.651500,121.060200");
    await openInMaps(circle);
    expect(linking.openURL).toHaveBeenCalledWith(placeMapUrl(circle));
  });
});

describe("places near you", () => {
  it("sends only the area and the kind", async () => {
    respond({ data: { places: [circle] } });
    const hook = useNearbyPlaces(here, "parks");
    expect(JSON.stringify((hook as unknown as { queryKey: unknown }).queryKey)).not.toContain("14.6515");
    expect(await runQuery(hook)).toEqual([circle]);
    expect(argsOf("invoke")[0]).toEqual(["places-nearby", { body: { cell: "14.65:121.05", category: "parks" } }]);
    expect(useNearbyPlaces(null, "food")).toMatchObject({ enabled: false });
  });

  it("gives the server's sentence, or a network sentence", async () => {
    respond({
      error: new FunctionsHttpError(new Response(JSON.stringify({ error: "Places are not set up." }), { status: 500 })),
    });
    await expect(runQuery(useNearbyPlaces(here, "food"))).rejects.toThrow("Places are not set up.");
    respond({ error: new Error("offline") });
    await expect(runQuery(useNearbyPlaces(here, "food"))).rejects.toThrow("Check your connection");
    respond({ data: null });
    expect(await runQuery(useNearbyPlaces(here, "food"))).toEqual([]);
  });

  it("saves a place in a trip's Ideas", async () => {
    await runMutation(useSaveIdea(), { tripId: "t1", place: circle, category: "parks" });
    expect(argsOf("insert")[0][0]).toEqual({
      trip_id: "t1",
      kind: "go",
      title: "Quezon Memorial Circle",
      day: null,
      place: "Quezon Memorial Circle",
      map_url: placeMapUrl(circle),
      currency: "PHP",
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["travel"] });
    await expectWriteErrors([[useSaveIdea(), { tripId: "t", place: circle, category: "food" }]]);
  });
});

describe("place suggestions", () => {
  const feature = (name: string | undefined, props: Record<string, string> = {}) => ({
    geometry: { coordinates: [120.6, 16.41] as [number, number] },
    properties: { name, ...props },
  });

  it("keeps 5 named places once each", () => {
    const list = photonSuggestions([
      feature("Hill Station", { street: "Casa Vallejo", city: "Baguio" }),
      feature("Hill Station", { street: "Casa Vallejo", city: "Baguio" }),
      feature(undefined),
      feature("Session Road", { county: "Benguet", state: "Cordillera" }),
      feature("Somewhere", { country: "Philippines" }),
      feature("A", { city: "x" }),
      feature("B", { city: "x" }),
      feature("C", { city: "x" }),
    ]);
    expect(list.map((s) => [s.name, s.detail])).toEqual([
      ["Hill Station", "Casa Vallejo, Baguio"],
      ["Session Road", "Benguet, Cordillera"],
      ["Somewhere", "Philippines"],
      ["A", "x"],
      ["B", "x"],
    ]);
    expect(list[0].mapUrl).toBe("https://www.google.com/maps/search/?api=1&query=16.410000,120.600000");
  });

  it("asks Photon near the Philippines", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ features: [feature("Hill Station")] }) });
    expect(await searchPhoton("Hill Sta")).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("q=Hill+Sta");
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await searchPhoton("zzz")).toEqual([]);
    fetchMock.mockResolvedValueOnce({ ok: false });
    await expect(searchPhoton("x")).rejects.toThrow("Could not search places.");
  });
});
