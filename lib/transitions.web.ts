import type { StackNavigationOptions } from "expo-router/js-stack";

import { fadeOptions } from "@/lib/transitions.shared";

// The web keeps the browser's own back, so it has no drag. Every screen gets a short fade.
export function pushOptions(): StackNavigationOptions {
  return { ...fadeOptions, gestureEnabled: false };
}

export function riseOptions(): StackNavigationOptions {
  return pushOptions();
}
