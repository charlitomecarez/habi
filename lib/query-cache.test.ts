import { describe, expect, it } from "vitest";

import { isSaved, MAX_AGE, STALE_TIMES } from "@/lib/query-cache";

describe("isSaved", () => {
  it("never saves the vault, decrypted photos, signed URLs or job matches", () => {
    for (const key of [
      ["vault-entries"],
      ["vault-pin"],
      ["vault-anything"],
      ["secure-photo", "p", true],
      ["photo-urls", ["a"]],
      ["jobs"],
    ]) {
      expect(isSaved(key)).toBe(false);
    }
  });

  it("saves the Home modules", () => {
    for (const key of [["todos"], ["money", "subscriptions"], ["health"], ["user-settings"], ["news", "latest", 3]]) {
      expect(isSaved(key)).toBe(true);
    }
  });
});

describe("cache times", () => {
  it("keeps the saved cache for 7 days", () => {
    expect(MAX_AGE).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("sets the stale time of each kind from the handoff", () => {
    const of = new Map(STALE_TIMES);
    expect(of.get("todos")).toBe(30_000);
    expect(of.get("vehicle")).toBe(5 * 60_000);
    expect(of.get("news")).toBe(30 * 60_000);
    expect(of.get("vehicle-models")).toBe(24 * 60 * 60_000);
  });
});
