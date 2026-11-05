import { usePreventScreenCapture } from "expo-screen-capture";

/** Blocks screenshots, screen recording and the recent apps preview while mounted. */
export function useSecureScreen(key: string) {
  usePreventScreenCapture(key);
}
