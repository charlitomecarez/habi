import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  debtStatus,
  useDebt,
  useDebtPayments,
  useDebts,
  useDeleteDebt,
  useDeletePayment,
  useRecordPayment,
  useSaveDebt,
} from "@/lib/debts";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("debts data", () => {
  it("joins each debt with its balance, or the full amount", async () => {
    respond(
      {
        data: [
          { id: "d1", amount: 1000 },
          { id: "d2", amount: 500 },
        ],
      },
      { data: [{ debt_id: "d1", paid: 400, balance: 600 }] },
    );
    expect(await runQuery(useDebts())).toEqual([
      { id: "d1", amount: 1000, paid: 400, balance: 600 },
      { id: "d2", amount: 500, paid: 0, balance: 500 },
    ]);
    expect(useDebt("d1").data).toBeUndefined();
    respond({ error: new Error("a") }, {});
    await expect(runQuery(useDebts())).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runQuery(useDebts())).rejects.toThrow("b");
  });

  it("reads the payments of a debt", async () => {
    respond({ data: [{ id: "p1" }] });
    expect(await runQuery(useDebtPayments("d1"))).toEqual([{ id: "p1" }]);
    respond({ error: new Error("down") });
    await expect(runQuery(useDebtPayments("d1"))).rejects.toThrow("down");
  });

  it("saves, pays and deletes", async () => {
    const input = {
      personName: "Ana",
      direction: "owed_to_me" as const,
      amount: 1000,
      occurredOn: new Date(2026, 10, 1),
      dueOn: new Date(2026, 10, 30),
      note: null,
    };
    await runMutation(useSaveDebt(), { input });
    await runMutation(useSaveDebt(), { id: "d1", input: { ...input, dueOn: null } });
    await runMutation(useRecordPayment(), { debtId: "d1", amount: 200, paidOn: new Date(2026, 10, 11) });
    await runMutation(useDeletePayment(), "p1");
    await runMutation(useDeleteDebt(), "d1");
    expect(argsOf("insert")[0][0]).toMatchObject({ occurred_on: "2026-11-01", due_on: "2026-11-30" });
    expect(argsOf("update")[0][0]).toMatchObject({ due_on: null });
    expect(argsOf("rpc")[0]).toEqual([
      "record_debt_payment",
      { p_debt_id: "d1", p_amount: 200, p_paid_on: "2026-11-11" },
    ]);
    expect(targets().slice(-2)).toEqual(["debt_payments", "debts"]);
    await expectWriteErrors([
      [useSaveDebt(), { input }],
      [useRecordPayment(), { debtId: "d", amount: 1, paidOn: new Date() }],
      [useDeletePayment(), "p"],
      [useDeleteDebt(), "d"],
    ]);
  });

  it("always gives the status a word", () => {
    const now = new Date(2026, 10, 11);
    expect(debtStatus({ balance: 0, due_on: null }, now).text).toBe("Paid");
    expect(debtStatus({ balance: 100, due_on: null }, now).text).toBe("₱100 left");
    expect(debtStatus({ balance: 100, due_on: "2026-11-01" }, now)).toEqual({
      text: "Overdue · was due Nov 1",
      tone: "danger",
    });
    expect(debtStatus({ balance: 100, due_on: "2026-11-11" }, now).text).toBe("Due today");
    expect(debtStatus({ balance: 100, due_on: "2026-11-15" }, now).tone).toBe("warning");
    expect(debtStatus({ balance: 100, due_on: "2026-12-25" }, now).tone).toBe("neutral");
  });
});
