import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Every timing lives in lib/motion.ts. A screen or a component uses a name from there.
const TIMING = /\bduration:\s*\d|\b[A-Z_]*_MS\s*=\s*\d|transition=\{[^}]*\b\d{2,}\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("motion", () => {
  it("no screen or component sets its own timing", () => {
    const local = [...sourceFiles("app"), ...sourceFiles("components")].filter((path) =>
      TIMING.test(readFileSync(path, "utf8")),
    );
    expect(local).toEqual([]);
  });
});
