import { describe, expect, it, vi } from "vitest";

import { countText } from "@/lib/module-details";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/photos", () => ({}));
vi.mock("@/lib/alarm", () => ({ getAlarms: () => [] }));
vi.mock("@/lib/vault", () => ({ useVaultEntries: vi.fn(), useVaultStore: vi.fn() }));
vi.mock("@/lib/health", () => ({ useHealth: vi.fn() }));
vi.mock("@/lib/documents", () => ({ useDocuments: vi.fn() }));
vi.mock("@/lib/inventory", () => ({ useItems: vi.fn() }));
vi.mock("@/lib/journal", () => ({ useJournal: vi.fn() }));

describe("countText", () => {
  it("words one and many", () => {
    expect(countText(1, "item")).toBe("1 item");
    expect(countText(0, "item")).toBe("0 items");
    expect(countText(2, "person", "people")).toBe("2 people");
  });

  it("stays empty while loading", () => {
    expect(countText(undefined, "item")).toBeUndefined();
  });
});
