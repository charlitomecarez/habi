import { describe, expect, it } from "vitest";

import { cellCenter, CELL, distanceKm, kindWord, parseGeoapify, placeImage, toCell } from "./places.ts";

describe("areas", () => {
  it("rounds a spot to the nearest 0.05", () => {
    expect(toCell(14.6512, 121.0491)).toBe("14.65:121.05");
    expect(toCell(16.4123, 120.5987)).toBe("16.40:120.60");
    expect(toCell(-0.01, -0.02)).toBe("0.00:0.00");
    expect(CELL.test(toCell(14.6512, 121.0491))).toBe(true);
    expect(cellCenter("14.65:121.05")).toEqual({ latitude: 14.65, longitude: 121.05 });
  });

  it("measures the distance in km", () => {
    const qc = { latitude: 14.6515, longitude: 121.0493 };
    const cubao = { latitude: 14.6195, longitude: 121.0537 };
    expect(distanceKm(qc, cubao)).toBeCloseTo(3.6, 1);
    expect(distanceKm(qc, qc)).toBe(0);
  });
});

describe("Geoapify", () => {
  it("names the kind from the most exact category", () => {
    expect(kindWord(["entertainment", "entertainment.museum"], "sights")).toBe("Museum");
    expect(kindWord(["commercial.shopping_mall"], "shopping")).toBe("Mall");
    expect(kindWord(["catering.cafe.coffee_shop", "catering.cafe"], "food")).toBe("Coffee shop");
    expect(kindWord([], "parks")).toBe("Park");
  });

  it("keeps named places only", () => {
    const features = [
      { properties: { name: "Quezon Memorial Circle", lat: 14.65, lon: 121.05, categories: ["leisure.park"] } },
      { properties: { lat: 14.6, lon: 121 } },
      { properties: { name: "No point" } },
    ];
    expect(parseGeoapify(features, "parks")).toEqual([
      { name: "Quezon Memorial Circle", kind: "Park", latitude: 14.65, longitude: 121.05 },
    ]);
  });

  it("takes a photo from an https image tag or a Wikimedia Commons file", () => {
    expect(placeImage({ datasource: { raw: { image: "https://example.org/a.jpg" } } })).toBe(
      "https://example.org/a.jpg",
    );
    expect(placeImage({ datasource: { raw: { image: "http://example.org/a.jpg" } } })).toBeUndefined();
    expect(placeImage({ wiki_and_media: { wikimedia_commons: "File:Sample Park.jpg" } })).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sample_Park.jpg?width=256",
    );
    expect(placeImage({ wiki_and_media: { wikimedia_commons: "Category:Parks" } })).toBeUndefined();
    expect(placeImage({})).toBeUndefined();
  });
});
