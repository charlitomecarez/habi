import * as Clipboard from "expo-clipboard";

/** Copies text, then clears the clipboard after `clearAfterMs` if it still holds that text. */
export async function copySecret(text: string, clearAfterMs: number): Promise<void> {
  await Clipboard.setStringAsync(text);
  setTimeout(async () => {
    try {
      if ((await Clipboard.getStringAsync()) === text) await Clipboard.setStringAsync("");
    } catch {
      // The app may be in the background; the next copy replaces the value anyway.
    }
  }, clearAfterMs);
}

/** Copies text that is not secret, for example a Claude Code command. */
export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
