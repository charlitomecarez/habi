import { useEffect, useRef, useState } from "react";

import { searchPhoton, type PlaceSuggestion } from "@/lib/places";

const MIN_LETTERS = 3;
const PAUSE_MS = 400;

/**
 * Place suggestions for a trip item, after 3 letters and a short pause. A late reply never overwrites
 * a newer one, and a failed search shows nothing, so you can always type freely.
 */
export function usePlaceSuggestions() {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    setSuggestions([]);
  }

  function onType(text: string) {
    clear();
    if (text.trim().length < MIN_LETTERS) return;
    timer.current = setTimeout(() => {
      const controller = new AbortController();
      request.current = controller;
      searchPhoton(text.trim(), controller.signal)
        .then((found) => {
          if (!controller.signal.aborted) setSuggestions(found);
        })
        .catch(() => {});
    }, PAUSE_MS);
  }

  return { suggestions, onType, clear };
}
