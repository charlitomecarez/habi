import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useAddGift,
  useBuyGift,
  useDeleteGift,
  useDeletePerson,
  useDeletePersonDate,
  usePeople,
  useSavePerson,
  useSavePersonDate,
} from "@/lib/people";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const fail = { error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("people data", () => {
  it("reads people, dates and gifts", async () => {
    respond({ data: [{ id: "p" }] }, { data: [] }, { data: [] });
    expect(await runQuery(usePeople())).toEqual({ people: [{ id: "p" }], dates: [], gifts: [] });
    for (const order of [
      [fail, {}, {}],
      [{}, fail, {}],
      [{}, {}, fail],
    ]) {
      respond(...order);
      await expect(runQuery(usePeople())).rejects.toThrow("down");
    }
  });

  it("adds and edits a person", async () => {
    respond({ data: { id: "p9" } });
    expect(await runMutation(useSavePerson(), { name: "Ana", note: null })).toBe("p9");
    expect(await runMutation(useSavePerson(), { id: "p1", name: "Ana", note: "x" })).toBe("p1");
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["debts"] });
    respond(fail);
    await expect(runMutation(useSavePerson(), { id: "p1", name: "A", note: null })).rejects.toThrow("down");
  });

  it("saves dates and gifts, and buys a gift through one call", async () => {
    const input = { personId: "p1", kind: "birthday" as const, label: null, month: 3, day: 9, year: null };
    await runMutation(useSavePersonDate(), { input });
    await runMutation(useSavePersonDate(), { id: "d1", input });
    await runMutation(useAddGift(), { personId: "p1", title: "Book", price: 500 });
    await runMutation(useBuyGift(), { giftId: "g1", accountId: "a1", amount: 480 });
    await runMutation(useDeleteGift(), "g1");
    await runMutation(useDeletePersonDate(), "d1");
    await runMutation(useDeletePerson(), "p1");
    expect(targets()).toEqual([
      "person_dates",
      "person_dates",
      "gift_ideas",
      "buy_gift",
      "gift_ideas",
      "person_dates",
      "people",
    ]);
    expect(argsOf("rpc")[0][1]).toEqual({ p_gift_id: "g1", p_account_id: "a1", p_amount: 480 });
    await expectWriteErrors([
      [useSavePerson(), { name: "A", note: null }],
      [useSavePersonDate(), { input }],
      [useAddGift(), { personId: "p1", title: "x", price: null }],
      [useBuyGift(), { giftId: "g", accountId: "a", amount: 1 }],
      [useDeleteGift(), "g"],
      [useDeletePersonDate(), "d"],
      [useDeletePerson(), "p"],
    ]);
  });
});
