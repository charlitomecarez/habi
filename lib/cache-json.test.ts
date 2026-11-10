import { describe, expect, it } from "vitest";

import { fromCacheJson, toCacheJson } from "@/lib/cache-json";

describe("cache JSON", () => {
  it("keeps a Map of Sets, as the habit checks are", () => {
    const checks = new Map([["h1", new Set(["2026-11-09", "2026-11-10"])]]);
    const back = fromCacheJson<{ checks: Map<string, Set<string>> }>(toCacheJson({ checks }));
    expect(back.checks).toBeInstanceOf(Map);
    expect(back.checks.get("h1")).toEqual(new Set(["2026-11-09", "2026-11-10"]));
  });

  it("keeps a nested Map, as the budget spending is", () => {
    const spent = new Map([["c1", new Map([["2026-11", 1250]])]]);
    expect(fromCacheJson<Map<string, Map<string, number>>>(toCacheJson(spent)).get("c1")?.get("2026-11")).toBe(1250);
  });

  it("keeps a Date as a Date, and plain values as they are", () => {
    const at = new Date("2026-11-10T12:00:00.000Z");
    const back = fromCacheJson<{ at: Date; n: number; s: string; none: null }>(
      toCacheJson({ at, n: 3, s: "2026-11-10", none: null }),
    );
    expect(back.at).toBeInstanceOf(Date);
    expect(back.at.getTime()).toBe(at.getTime());
    expect(back).toMatchObject({ n: 3, s: "2026-11-10", none: null });
  });
});
