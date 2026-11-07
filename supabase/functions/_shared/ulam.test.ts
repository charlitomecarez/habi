import { describe, expect, it } from "vitest";

import { parseUlamReply, priceIngredients, ulamPrompt, type UlamContext } from "./ulam";
import { checkedPhoto, commonsPhoto } from "./ulam-photos";
import { ULAM_PRICES } from "./ulam-prices";

const context: UlamContext = { limit: 99, recent: [], avoid: [] };

const dish = (over: Record<string, unknown> = {}) => ({
  name: "Ginisang monggo",
  kind: "beans",
  ingredients: ["mung-beans", "onion", "garlic", "tomato", "oil"],
  cookMinutes: 40,
  kcal: 280,
  steps: ["Boil the beans.", "Sauté the garlic and onion.", "Mix them and boil."],
  ...over,
});
const reply = (...items: unknown[]) => JSON.stringify({ ulam: items });
const three = (first = dish()) => reply(first, dish({ name: "Tortang talong" }), dish({ name: "Adobong kangkong" }));

describe("price list", () => {
  it("has unique ids and whole, positive prices", () => {
    expect(new Set(ULAM_PRICES.map((p) => p.id)).size).toBe(ULAM_PRICES.length);
    expect(ULAM_PRICES.every((p) => p.price > 0 && Number.isInteger(p.price))).toBe(true);
  });
});

describe("priceIngredients", () => {
  it("adds the prices, and counts a repeated id twice", () => {
    expect(priceIngredients(["egg", "egg", "oil"])?.cost).toBe(20);
  });

  it("refuses an id that is not on the list", () => {
    expect(priceIngredients(["egg", "caviar"])).toBeNull();
  });
});

describe("parseUlamReply", () => {
  it("accepts a good reply and works out the cost itself", () => {
    const result = parseUlamReply(three(dish({ cost: 1 })), context);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.ulam[0].cost).toBe(26);
  });

  it("rejects bad JSON", () => {
    expect(parseUlamReply("not json", context)).toEqual({ ok: false, problems: ["The reply is not valid JSON."] });
    expect(parseUlamReply("null", context).ok).toBe(false);
  });

  it("rejects the wrong number of ulam", () => {
    expect(parseUlamReply(reply(dish()), context).ok).toBe(false);
  });

  it("rejects a cost over the limit", () => {
    const result = parseUlamReply(three(), { ...context, limit: 25 });
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).toContain("over ₱25");
  });

  it("rejects a repeat from the last 7 days, in any case", () => {
    expect(parseUlamReply(three(), { ...context, recent: ["GINISANG MONGGO"] }).ok).toBe(false);
  });

  it("rejects two ulam with the same name", () => {
    expect(parseUlamReply(reply(dish(), dish(), dish({ name: "Other" })), context).ok).toBe(false);
  });

  it("rejects food you never eat, in the name or an ingredient", () => {
    expect(parseUlamReply(three(), { ...context, avoid: ["mung"] }).ok).toBe(false);
    expect(parseUlamReply(three(), { ...context, avoid: ["monggo"] }).ok).toBe(false);
  });

  it.each([
    ["an unknown ingredient", { ingredients: ["caviar"] }],
    ["no ingredients", { ingredients: [] }],
    ["too few steps", { steps: ["One.", "Two."] }],
    ["too many steps", { steps: Array(9).fill("Step.") }],
    ["a blank step", { steps: ["One.", " ", "Three."] }],
    ["a cook time out of range", { cookMinutes: 500 }],
    ["calories out of range", { kcal: 5 }],
    ["text calories", { kcal: "280" }],
    ["an unknown kind", { kind: "dessert" }],
    ["no name", { name: " " }],
  ])("rejects %s", (_label, over) => {
    expect(parseUlamReply(three(dish(over)), context).ok).toBe(false);
  });
});

describe("ulamPrompt", () => {
  it("holds the limit, the repeats and the food to avoid", () => {
    const prompt = ulamPrompt({ limit: 80, recent: ["Tortang talong"], avoid: ["shrimp"] });
    expect(prompt).toContain("₱80");
    expect(prompt).toContain("Tortang talong");
    expect(prompt).toContain("shrimp");
  });

  it("passes back the problems on the second try", () => {
    expect(ulamPrompt(context, ["Too expensive."])).toContain("Too expensive.");
  });
});

describe("ulam photos", () => {
  it("finds a checked photo by name, in any case", () => {
    expect(checkedPhoto("Pinakbet")).toMatch(/^https:/);
    expect(checkedPhoto("  CHICKEN ADOBO ")).toMatch(/^https:/);
  });

  it("finds a longer name that holds a checked dish", () => {
    expect(checkedPhoto("Chicken adobo sa gata")).toBe(checkedPhoto("Chicken adobo"));
  });

  it("has no photo for an unknown dish", () => {
    expect(checkedPhoto("Tuyo at kamatis")).toBeUndefined();
  });

  it("reads a Commons reply, and refuses anything else", () => {
    const reply = (thumburl: string) => ({ query: { pages: { "1": { imageinfo: [{ thumburl }] } } } });
    expect(commonsPhoto(reply("https://upload.wikimedia.org/a.jpg"))).toBe("https://upload.wikimedia.org/a.jpg");
    expect(commonsPhoto(reply("http://example.com/a.jpg"))).toBeUndefined();
    expect(commonsPhoto({})).toBeUndefined();
    expect(commonsPhoto(null)).toBeUndefined();
  });
});
