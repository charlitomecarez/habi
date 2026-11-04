// Ported from content-planner/src/lib/stages.spec.ts.
import { describe, expect, it } from "vitest";

import { commandFor, daysFrom, nextAction, progress, relativeDay, stage, type StageFields } from "@/lib/content/stages";

const v = (p: Partial<StageFields> = {}): StageFields => ({ stage: "script", done_steps: [], format: "long", ...p });

describe("nextAction", () => {
  it("returns the first unchecked step", () => {
    const a = nextAction(v({ done_steps: ["script.draft"] }));
    expect(a.kind === "step" && a.step.id).toBe("script.punchup");
  });
  it("moves on when every step is done", () => {
    const a = nextAction(v({ done_steps: ["script.draft", "script.punchup", "script.read"] }));
    expect(a.kind === "advance" && a.to.id).toBe("record");
  });
  it("skips the reel step for shorts", () => {
    const a = nextAction(v({ stage: "publish", format: "short", done_steps: ["publish.meta", "publish.upload"] }));
    expect(a.kind).toBe("advance");
  });
  it("is done when published", () => {
    expect(nextAction(v({ stage: "published" })).kind).toBe("done");
  });
});

describe("progress", () => {
  it("goes from 0 to 1", () => {
    expect(progress(v({ stage: "idea" }))).toBe(0);
    expect(progress(v({ stage: "published" }))).toBe(1);
    const mid = progress(v({ stage: "edit" }));
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.7);
  });
});

describe("commandFor", () => {
  it("adds the project folder for project commands", () => {
    const step = stage("edit").steps.find((s) => s.id === "edit.roughcut")!;
    expect(commandFor(step, "2026-11-02-x")).toBe("/roughcut projects/2026-11-02-x");
    expect(commandFor(step, "")).toBe("/roughcut");
  });
});

describe("dates", () => {
  it("describes relative days", () => {
    const now = new Date(2026, 9, 31, 20);
    expect(relativeDay("2026-10-31", now)).toBe("today");
    expect(relativeDay("2026-11-01", now)).toBe("tomorrow");
    expect(relativeDay("2026-10-28", now)).toBe("3 days late");
    expect(daysFrom("2026-11-10", now)).toBe(10);
  });
});
