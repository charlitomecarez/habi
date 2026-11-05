import { requireOptionalNativeModule } from "expo";

export type AlarmSetup = { notifications: boolean; fullScreen: boolean; battery: boolean };

type AlarmNative = {
  getAlarms(): string;
  saveAlarms(json: string): void;
  getRingingId(): string | null;
  stopRinging(): void;
  getSetup(): AlarmSetup;
  openFullScreenSettings(): void;
  openAppSettings(): void;
};

/** Null when the native module is not in this build (an older dev build, or not Android). */
export const AlarmModule = requireOptionalNativeModule<AlarmNative>("Alarm");
