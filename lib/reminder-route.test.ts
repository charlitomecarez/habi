import { describe, expect, it } from "vitest";

import { reminderRoute } from "@/lib/reminder-route";

describe("reminderRoute", () => {
  it("opens the item", () => {
    expect(reminderRoute("todo", "t1")).toEqual({ pathname: "/todo/[id]", params: { id: "t1" } });
    expect(reminderRoute("subscription", "s1")).toEqual({ pathname: "/money/subscription/[id]", params: { id: "s1" } });
  });

  it("opens the list for a push from the old function, which has no ID", () => {
    expect(reminderRoute("todo", undefined)).toBe("/todos");
    expect(reminderRoute("debt", null)).toBe("/debts");
  });

  it("opens the list when the ID belongs to a child row", () => {
    expect(reminderRoute("person_date", "d1")).toBe("/people");
    expect(reminderRoute("medicine", "m1")).toBe("/health");
    expect(reminderRoute("workout", "w1")).toBe("/gym");
  });

  it("opens Home for a source that the app does not know", () => {
    expect(reminderRoute("custom", "c1")).toBe("/");
    expect(reminderRoute("something-new", "x")).toBe("/");
  });
});
