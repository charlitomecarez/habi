import * as Clipboard from "expo-clipboard";

/**
 * Copies text, then clears the clipboard after `clearAfterMs`. Browsers ask
 * for permission to read the clipboard, so web clears it without checking
 * what it holds.
 */
export async function copySecret(text: string, clearAfterMs: number): Promise<void> {
  await Clipboard.setStringAsync(text);
  setTimeout(() => {
    Clipboard.setStringAsync("").catch(() => {
      // Browsers refuse to write while the tab is not focused.
    });
  }, clearAfterMs);
}

/** Copies text that is not secret, for example a Claude Code command. */
export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}
