import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// A screen with a text field needs keyboard handling, or the Android keyboard covers the field.
// Full-screen forms use KeyboardScrollView or KeyboardAvoidingView; fields in a bottom sheet use Sheet,
// which moves up with the keyboard.
const FIELD = /<(TextInput|Input|PasswordInput|AmountInput)[\s>]/;
const HANDLED = /<(KeyboardScrollView|KeyboardAvoidingView|Sheet)[\s>]/;

function screenFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return screenFiles(path);
    return path.endsWith(".tsx") && !path.endsWith(".web.tsx") ? [path] : [];
  });
}

describe("keyboard handling", () => {
  it("every screen with a text field handles the keyboard", () => {
    const missing = screenFiles("app").filter((path) => {
      const source = readFileSync(path, "utf8");
      return FIELD.test(source) && !HANDLED.test(source);
    });
    expect(missing).toEqual([]);
  });
});
