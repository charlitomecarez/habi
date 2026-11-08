import { requireOptionalNativeModule } from "expo";

export type AppUsage = { packageName: string; label: string; totalMs: number };
/** A screen on or off moment, in epoch ms. */
export type ScreenEvent = { at: number; on: boolean };

type ScreenTimeNative = {
  hasAccess(): boolean;
  openSettings(): void;
  getUsage(startMs: number, endMs: number): Promise<AppUsage[]>;
  getScreenEvents(startMs: number, endMs: number): Promise<ScreenEvent[]>;
};

/** Null when the native module is not in this build (an older dev build, or not Android). */
export const ScreenTimeModule = requireOptionalNativeModule<ScreenTimeNative>("ScreenTime");
