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
vi.mock("@/lib/weather", () => ({ useWeather: vi.fn() }));

describe("countText", () => {
  it("shows only the number", () => {
    expect(countText(1)).toBe("1");
    expect(countText(0)).toBe("0");
    expect(countText(1200)).toBe("1,200");
  });

  it("stays empty while loading", () => {
    expect(countText(undefined)).toBeUndefined();
  });
});
