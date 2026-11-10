/**
 * JSON for the saved query cache. Some queries hold a Map, a Set or a Date, which plain JSON turns
 * into `{}` or a string, so these keep a tag and come back as the same type.
 */

type Tagged = { __t: "Map"; v: [unknown, unknown][] } | { __t: "Set"; v: unknown[] } | { __t: "Date"; v: string };

function isTagged(value: unknown): value is Tagged {
  return typeof value === "object" && value !== null && "__t" in value && "v" in value;
}

export function toCacheJson(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, v: unknown) {
    // `this[key]` is the value before Date.toJSON runs.
    const raw = this[key];
    if (raw instanceof Date) return { __t: "Date", v: raw.toISOString() };
    if (v instanceof Map) return { __t: "Map", v: [...v] };
    if (v instanceof Set) return { __t: "Set", v: [...v] };
    return v;
  });
}

export function fromCacheJson<T>(text: string): T {
  return JSON.parse(text, (_key, v: unknown) => {
    if (!isTagged(v)) return v;
    if (v.__t === "Map") return new Map(v.v);
    if (v.__t === "Set") return new Set(v.v);
    return new Date(v.v);
  }) as T;
}
