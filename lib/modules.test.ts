import { describe, expect, it } from "vitest";

import { ALL_MODULES, MAX_SHORTCUTS, searchModules, shortcutModules, toggleShortcut } from "@/lib/modules";

describe("modules", () => {
  it("gives every module a unique id", () => {
    expect(new Set(ALL_MODULES.map((m) => m.id)).size).toBe(ALL_MODULES.length);
  });
});

describe("shortcutModules", () => {
  it("keeps your order and skips names it does not know", () => {
    expect(shortcutModules(["vault", "gone", "journal"]).map((m) => m.id)).toEqual(["vault", "journal"]);
  });

  it("stops at the limit", () => {
    expect(shortcutModules(ALL_MODULES.map((m) => m.id))).toHaveLength(MAX_SHORTCUTS);
  });
});

describe("toggleShortcut", () => {
  it("adds and removes", () => {
    expect(toggleShortcut(["vault"], "journal")).toEqual(["vault", "journal"]);
    expect(toggleShortcut(["vault", "journal"], "vault")).toEqual(["journal"]);
  });

  it("adds nothing past the limit", () => {
    const full = Array.from({ length: MAX_SHORTCUTS }, (_, i) => `m${i}`);
    expect(toggleShortcut(full, "journal")).toEqual(full);
  });
});

describe("searchModules", () => {
  it("returns every section for empty text", () => {
    expect(searchModules("  ").flatMap((s) => s.modules)).toHaveLength(ALL_MODULES.length);
  });

  it("finds a module by a keyword, in any case", () => {
    expect(searchModules("UTANG").flatMap((s) => s.modules.map((m) => m.id))).toEqual(["debts"]);
  });

  it("drops sections with no match", () => {
    expect(searchModules("no such module")).toEqual([]);
  });
});
