import { requireOptionalNativeModule } from "expo";

export type AppUsage = { packageName: string; label: string; totalMs: number };

type ScreenTimeNative = {
  hasAccess(): boolean;
  openSettings(): void;
  getUsage(startMs: number, endMs: number): Promise<AppUsage[]>;
};

/** Null when the native module is not in this build (an older dev build, or not Android). */
export const ScreenTimeModule = requireOptionalNativeModule<ScreenTimeNative>("ScreenTime");
