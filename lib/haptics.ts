import * as Haptics from "expo-haptics";

/**
 * One light tick, never a buzz: a todo or a habit is done, a swipe action passes the point where
 * it fires, a sheet snaps shut, a switch or a Segmented choice changes, a long press opens a menu.
 */
export function tick(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
