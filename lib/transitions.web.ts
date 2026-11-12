import type { StackNavigationOptions } from "expo-router/js-stack";

import { fadeOptions } from "@/lib/transitions.shared";

// The web keeps the browser's own back, so it has no drag. Every screen gets a short fade.
// A card that fills the window gets `min-height: 100%` from the stack and grows with its content, so
// the screen's ScrollView has nothing to scroll. `flex: 1` keeps the card at the window height.
export function pushOptions(): StackNavigationOptions {
  return { ...fadeOptions, gestureEnabled: false, cardStyle: { flex: 1 } };
}

export function riseOptions(): StackNavigationOptions {
  return pushOptions();
}
