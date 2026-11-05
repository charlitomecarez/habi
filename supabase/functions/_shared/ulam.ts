// Pure Ulam rules, shared by the daily-ulam function and the app.
import { ULAM_PRICES } from "./ulam-prices.ts";

/** Picks the bundled picture. Groq gives only text, so a dish never has its own photo. */
export const ULAM_KINDS = ["egg", "vegetable", "beans", "fish", "meat", "soup"] as const;
export type UlamKind = (typeof ULAM_KINDS)[number];

export type UlamIngredient = { name: string; price: number };

export type Ulam = {
  name: string;
  kind: UlamKind;
  ingredients: UlamIngredient[];
  cost: number;
  cookMinutes: number;
  kcal: number;
  steps: string[];
};

export const OPTIONS_PER_DAY = 3;
export const MIN_STEPS = 3;
export const MAX_STEPS = 8;
export const MIN_COOK_MINUTES = 5;
export const MAX_COOK_MINUTES = 90;
export const MIN_KCAL = 50;
export const MAX_KCAL = 900;
/** The most one ulam can cost. "Below ₱100", with most near the target. */
export const MAX_LIMIT = 99;
export const TARGET_COST = 50;
/** One cup of rice, for the "with rice" lines. */
export const RICE_KCAL = 200;

const PRICE_BY_ID = new Map(ULAM_PRICES.map((p) => [p.id, p]));
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Turns ingredient ids into names and prices. The total never comes from the model. */
export function priceIngredients(ids: readonly string[]): { ingredients: UlamIngredient[]; cost: number } | null {
  const ingredients: UlamIngredient[] = [];
  for (const id of ids) {
    const item = PRICE_BY_ID.get(id);
    if (!item) return null;
    ingredients.push({ name: item.name, price: item.price });
  }
  return { ingredients, cost: ingredients.reduce((total, i) => total + i.price, 0) };
}

export type UlamContext = {
  /** The most one ulam can cost. */
  limit: number;
  /** Names from the last 7 days. */
  recent: readonly string[];
  /** Food you never eat. Matched against the dish and its ingredients. */
  avoid: readonly string[];
};

type Check = { ulam: Ulam } | { problem: string };

function checkOne(raw: unknown, context: UlamContext): Check {
  if (typeof raw !== "object" || raw === null) return { problem: "An ulam is not an object." };
  const item = raw as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!name) return { problem: "An ulam has no name." };
  if (!ULAM_KINDS.includes(item.kind as UlamKind)) return { problem: `${name}: unknown kind.` };

  const ids = item.ingredients;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string")) {
    return { problem: `${name}: ingredients must be ids from the price list.` };
  }
  const priced = priceIngredients(ids as string[]);
  if (!priced) return { problem: `${name}: an ingredient id is not in the price list.` };
  if (priced.cost > context.limit) return { problem: `${name}: costs ₱${priced.cost}, over ₱${context.limit}.` };

  const steps = item.steps;
  if (!Array.isArray(steps) || !steps.every((s) => typeof s === "string" && s.trim())) {
    return { problem: `${name}: steps must be text.` };
  }
  if (steps.length < MIN_STEPS || steps.length > MAX_STEPS) {
    return { problem: `${name}: needs ${MIN_STEPS} to ${MAX_STEPS} steps.` };
  }

  const cookMinutes = item.cookMinutes;
  if (typeof cookMinutes !== "number" || cookMinutes < MIN_COOK_MINUTES || cookMinutes > MAX_COOK_MINUTES) {
    return { problem: `${name}: cook time is out of range.` };
  }
  const kcal = item.kcal;
  if (typeof kcal !== "number" || kcal < MIN_KCAL || kcal > MAX_KCAL) {
    return { problem: `${name}: calories are out of range.` };
  }

  if (context.recent.some((r) => sameName(r, name))) return { problem: `${name}: was in the last 7 days.` };
  const text = `${name} ${priced.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
  const avoided = context.avoid.find((a) => a.trim() && text.includes(a.trim().toLowerCase()));
  if (avoided) return { problem: `${name}: has ${avoided}, which you never eat.` };

  return {
    ulam: {
      name,
      kind: item.kind as UlamKind,
      ingredients: priced.ingredients,
      cost: priced.cost,
      cookMinutes: Math.round(cookMinutes),
      kcal: Math.round(kcal),
      steps: (steps as string[]).map((s) => s.trim()),
    },
  };
}

export type UlamResult = { ok: true; ulam: Ulam[] } | { ok: false; problems: string[] };

/** Checks the model's JSON text. Any problem rejects the whole answer, so it can ask once more. */
export function parseUlamReply(text: string, context: UlamContext): UlamResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, problems: ["The reply is not valid JSON."] };
  }
  const list = (json as { ulam?: unknown } | null)?.ulam;
  if (!Array.isArray(list) || list.length !== OPTIONS_PER_DAY) {
    return { ok: false, problems: [`The reply needs a "ulam" list of ${OPTIONS_PER_DAY}.`] };
  }

  const checks = list.map((raw) => checkOne(raw, context));
  const problems = checks.flatMap((c) => ("problem" in c ? [c.problem] : []));
  const ulam = checks.flatMap((c) => ("ulam" in c ? [c.ulam] : []));
  if (new Set(ulam.map((u) => u.name.toLowerCase())).size !== ulam.length)
    problems.push("Two ulam have the same name.");
  return problems.length > 0 ? { ok: false, problems } : { ok: true, ulam };
}

/** The prompt. It holds no name, no email and no money data. */
export function ulamPrompt(context: UlamContext, problems: readonly string[] = []): string {
  const prices = ULAM_PRICES.map((p) => `${p.id}: ${p.name}, ₱${p.price}`).join("\n");
  const lines = [
    `Suggest ${OPTIONS_PER_DAY} different realistic Filipino home-cooked ulam for one person, for today.`,
    `Each must cost ₱${context.limit} or less, and aim for about ₱${TARGET_COST}. Rice is not included.`,
    "Use common dishes that a Filipino household really cooks. Keep the Filipino dish name.",
    "Write the steps in plain English, for one serving.",
    context.recent.length > 0 ? `Do not repeat these: ${context.recent.join(", ")}.` : "",
    context.avoid.length > 0 ? `Never use these: ${context.avoid.join(", ")}.` : "",
    "Use only ingredient ids from this price list. Each id counts as one portion, and an id may repeat:",
    prices,
    "Reply with JSON only, in this shape:",
    `{"ulam":[{"name":"Ginisang monggo","kind":"beans","ingredients":["mung-beans","onion"],"cookMinutes":40,"kcal":280,"steps":["Boil the mung beans for 25 minutes."]}]}`,
    `kind is one of: ${ULAM_KINDS.join(", ")}. kcal is your estimate for the ulam alone. Give ${MIN_STEPS} to ${MAX_STEPS} short steps.`,
  ];
  if (problems.length > 0) lines.push(`Your last answer had these problems. Fix them: ${problems.join(" ")}`);
  return lines.filter(Boolean).join("\n");
}
