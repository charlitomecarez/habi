import { BRANDS, type BrandData } from "@/lib/brands/data";

export type Brand = BrandData;

/** "NETFLIX.COM*Premium" → ["netflix", "com", "premium"]; "McDonald's" → ["mcdonalds"]; "Disney+" → ["disney", "plus"]. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\+/g, " plus ")
    .replace(/&/g, " and ")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

type Key = { brand: Brand; words: string[]; short: boolean };

// Longest keys first, so "youtube music" wins over "youtube".
const KEYS: Key[] = BRANDS.flatMap((brand) =>
  brand.keys.map((key) => {
    const w = words(key);
    return { brand, words: w, short: w.join("").length <= 2 };
  }),
).sort((a, b) => b.words.length - a.words.length || b.words.join("").length - a.words.join("").length);

function containsRun(haystack: string[], needle: string[]): boolean {
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

const cache = new Map<string, Brand | null>();

/**
 * The brand a name refers to, or null. A key matches when its words appear in order in the name,
 * so "NETFLIX.COM" and "Netflix Premium" are Netflix. One- and two-letter keys ("x", "hp") must be
 * the whole name, so "X" is X but "Box x2" is not.
 */
export function findBrand(name: string | null | undefined): Brand | null {
  if (!name) return null;
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const w = words(name);
  const hit = KEYS.find((k) => (k.short ? w.join(" ") === k.words.join(" ") : containsRun(w, k.words)));
  const brand = hit?.brand ?? null;
  cache.set(name, brand);
  return brand;
}
