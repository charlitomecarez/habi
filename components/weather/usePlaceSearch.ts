import { useRef, useState } from "react";

import { searchPlaces, type Place } from "@/lib/weather";

/** The place search of Weather: in the Philippines, or anywhere with `world`. A late reply never overwrites a newer one. */
export function usePlaceSearch({ world = false } = {}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  async function onChange(text: string) {
    setQuery(text);
    setFailed(false);
    const id = ++latest.current;
    if (text.trim().length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const found = await searchPlaces(text.trim(), { world });
      if (id === latest.current) setResults(found);
    } catch {
      if (id === latest.current) setFailed(true);
    } finally {
      if (id === latest.current) setSearching(false);
    }
  }

  function clear() {
    latest.current++;
    setQuery("");
    setResults(null);
    setSearching(false);
    setFailed(false);
  }

  return { query, results, searching, failed, onChange, clear };
}
