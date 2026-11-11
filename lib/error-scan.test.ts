import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// No screen shows a Supabase message. Errors go through ErrorNotice or errorText in lib/errors.ts.
// Form field errors from zod (fieldState, formState) are written by Habi, so they may show.
const RAW = /(?<![\w.])(?!fieldState\b|formState\b)[\w.?)!]*(?:error|Error|failure)\??\)?!?\.message\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("error text", () => {
  it("no screen or component shows an error's own message", () => {
    const raw = [...sourceFiles("app"), ...sourceFiles("components")].filter((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .some((line) => RAW.test(line) && !/fieldState|formState|console\./.test(line)),
    );
    expect(raw).toEqual([]);
  });
});
