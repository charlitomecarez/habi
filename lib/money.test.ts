import { describe, expect, it, vi } from "vitest";

import { suggestExpenseNames } from "@/lib/money";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const FOOD = "food-id";
const TRANSPORT = "transport-id";
const history = [
  { name: "Sample Jeep", categoryId: TRANSPORT },
  { name: "Sample Jeep", categoryId: TRANSPORT },
  { name: "sample jeep", categoryId: TRANSPORT },
  { name: "Sample Bakery", categoryId: FOOD },
  { name: "Sample Market", categoryId: FOOD },
  { name: "Sample Market", categoryId: FOOD },
  { name: "Food", categoryId: FOOD },
  { name: "   ", categoryId: FOOD },
];
const options = { query: "", categoryId: null, categoryNames: ["Food"] };

describe("suggestExpenseNames", () => {
  it("shows the most used names when the field is empty", () => {
    expect(suggestExpenseNames(history, options)).toEqual(["Sample Jeep", "Sample Market", "Sample Bakery"]);
  });

  it("puts the chosen category's names first", () => {
    expect(suggestExpenseNames(history, { ...options, categoryId: FOOD })[0]).toBe("Sample Market");
  });

  it("matches the typed text in any case, anywhere in the name", () => {
    expect(suggestExpenseNames(history, { ...options, query: "BAK" })).toEqual(["Sample Bakery"]);
  });

  it("leaves out the exact text you already typed", () => {
    expect(suggestExpenseNames(history, { ...options, query: "sample market" })).toEqual([]);
  });

  it("leaves out category names and blank names", () => {
    const names = suggestExpenseNames(history, options);
    expect(names).not.toContain("Food");
    expect(names).not.toContain("");
  });

  it("counts names in any case as one name, and keeps to the limit", () => {
    expect(suggestExpenseNames(history, { ...options, limit: 1 })).toEqual(["Sample Jeep"]);
  });
});
