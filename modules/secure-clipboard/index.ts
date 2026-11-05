import { requireOptionalNativeModule } from "expo";

type SecureClipboardNative = {
  copy(text: string, clearAfterMs: number): void;
};

/** Null when the native module is not in this build (an older dev build, or not Android). */
export const SecureClipboardModule = requireOptionalNativeModule<SecureClipboardNative>("SecureClipboard");
