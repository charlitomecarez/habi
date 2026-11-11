import { Easing, ReduceMotion, useReducedMotion } from "react-native-reanimated";

/**
 * Every timing in the app. A screen never sets a duration: it uses a shared component or a name
 * from here. Exits are faster than entrances. Reduce motion turns each move into a short fade.
 */
export const motion = {
  /** A tap target shrinks under the finger. */
  press: 90,
  pressScale: 0.97,
  /** Skeleton to content, a list that first shows, an image that loads. */
  fade: 180,
  /** Tab pill, Segmented thumb, a chip on and off, the header shrink. */
  glide: 240,
  /** A screen opens and closes. The old screen moves 25% and dims to 18%. */
  pushIn: 300,
  pushOut: 240,
  pushShift: 0.25,
  pushDim: 0.18,
  /** A full-screen form opens from the bottom. */
  riseIn: 320,
  riseOut: 240,
  /** An amount that changes on screen. */
  count: 400,
  /** The status strip on login and Home, once. A strand that weaves in. */
  stitch: 700,
  /** The slow loading pulse of a skeleton. */
  pulse: 1100,
  /** What each move becomes when reduce motion is on. */
  reduced: 120,
  /** How long the Undo snackbar stays. */
  snackbar: 5000,
  /** How long an Undo row stays in a list after a remove, as in World weather. */
  undo: 8000,
} as const;

/** A quick start with a soft stop, for glide, push and rise: cubic-bezier(0.16, 1, 0.3, 1). */
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Sheets and the release of any drag. No overshoot. */
export const sheetSpring = { damping: 26, stiffness: 280, overshootClamping: true, reduceMotion: ReduceMotion.System };

/** Glide timing for Reanimated, with the shared easing. */
export const glideTiming = { duration: motion.glide, easing: ease };

/** True when the phone's reduce-motion setting is on. */
export const useReduceMotion = useReducedMotion;
