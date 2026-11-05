import * as Clipboard from "expo-clipboard";

import { SecureClipboardModule } from "@/modules/secure-clipboard";

/**
 * Copies a secret, marked as sensitive, and clears the clipboard after `clearAfterMs`, also in the
 * background. If you copy something else in that time, that clears too. Older builds with no
 * native module fall back to a timer, which can stop in the background.
 */
export async function copySecret(text: string, clearAfterMs: number): Promise<void> {
  if (SecureClipboardModule) {
    SecureClipboardModule.copy(text, clearAfterMs);
    return;
  }
  await Clipboard.setStringAsync(text);
  setTimeout(() => {
    Clipboard.setStringAsync("").catch(() => undefined);
  }, clearAfterMs);
}

/** Copies text that is not secret, for example a Claude Code command. */
export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
