import { describe, expect, it, vi } from "vitest";

import {
  amountText,
  compactAmount,
  cycleLabel,
  formatMoney,
  formatPeso,
  parseAmount,
  parseBalance,
  renewalText,
} from "@/lib/money";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("money text", () => {
  it("formats pesos, other currencies and short amounts", () => {
    expect(formatPeso(-50)).toBe("−₱50");
    expect(formatMoney(9.99, "USD")).toBe("USD 9.99");
    expect(formatMoney(1, "PHP")).toBe("₱1");
    expect([850, 1250, 12500, 1_350_000].map(compactAmount)).toEqual(["850", "1.2k", "12k", "1.3M"]);
  });

  it("reads typed amounts and balances", () => {
    expect(parseAmount("₱1,234.5")).toBe(1234.5);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("1.234")).toBeNull();
    expect(parseBalance("−200")).toBe(-200);
    expect(parseBalance("abc")).toBeNull();
    expect(amountText(1234.5)).toBe("1234.50");
    expect(amountText(null)).toBe("");
  });

  it("names a cycle and the renewal state", () => {
    expect(cycleLabel("unknown" as never)).toBe("unknown");
    const now = new Date(2026, 10, 11);
    expect(renewalText("2026-11-01", now).status).toBe("overdue");
    expect(renewalText("2026-11-11", now).text).toBe("Renews today");
    expect(renewalText("2026-11-12", now).text).toBe("Renews Nov 12 · in 1 day");
    expect(renewalText("2027-01-12", now)).toEqual({ text: "Renews Jan 12", status: "later" });
  });
});
