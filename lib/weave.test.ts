import { describe, expect, it } from "vitest";

import { weaveSummary } from "@/lib/weave";

describe("weaveSummary", () => {
  it("counts each state in words", () => {
    const days = ["good", "good", "good", "good", "good", "over", "empty"] as const;
    expect(weaveSummary({ label: "Money", days })).toBe("Money: 5 good days, 1 over");
  });

  it("uses the singular for one good day", () => {
    expect(weaveSummary({ label: "Todos", days: ["good", "watch"] })).toBe("Todos: 1 good day, 1 to watch");
  });

  it("says when a row has no data", () => {
    expect(weaveSummary({ label: "Sleep", days: ["empty"] })).toBe("Sleep: no data");
  });
});
