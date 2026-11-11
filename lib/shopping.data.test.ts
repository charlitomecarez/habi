import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAddItem, useCheckout, useRemoveItem, useShopping, useUpdateItem } from "@/lib/shopping";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

const previous = {
  items: [
    { id: "a", name: "Rice", ticked: false },
    { id: "b", name: "Eggs", ticked: false },
  ],
  history: [],
};

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
  queryClient.getQueryData.mockReturnValue(previous);
});

describe("shopping data", () => {
  it("reads the list and the history", async () => {
    respond({ data: [{ id: "a" }] }, { data: [{ name: "Rice" }] });
    expect(await runQuery(useShopping())).toEqual({ items: [{ id: "a" }], history: [{ name: "Rice" }] });
    respond({ error: new Error("a") }, {});
    await expect(runQuery(useShopping())).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runQuery(useShopping())).rejects.toThrow("b");
  });

  it("ticks and removes before the server answers", async () => {
    await runMutation(useUpdateItem(), { id: "a", patch: { ticked: true } });
    expect((queryClient.setQueryData.mock.calls[0][1] as typeof previous).items[0].ticked).toBe(true);
    await runMutation(useRemoveItem(), "b");
    expect((queryClient.setQueryData.mock.calls[1][1] as typeof previous).items.map((i) => i.id)).toEqual(["a"]);
  });

  it("puts the list back when a change fails", async () => {
    respond({ error: new Error("down") });
    await expect(runMutation(useRemoveItem(), "a")).rejects.toThrow("down");
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(["shopping"], previous);
    queryClient.getQueryData.mockReturnValue(undefined);
    respond({ error: new Error("down") });
    await expect(runMutation(useUpdateItem(), { id: "a", patch: {} })).rejects.toThrow("down");
  });

  it("adds an item and checks out", async () => {
    await runMutation(useAddItem(), { name: "Milk", quantity: "1", price: null });
    respond({ data: 2 });
    expect(await runMutation(useCheckout(), { accountId: "a1", categoryId: null, store: "SM" })).toBe(2);
    expect(argsOf("rpc")[0]).toEqual(["shopping_checkout", { p_account_id: "a1", p_category_id: null, p_store: "SM" }]);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["money"] });
    await expectWriteErrors([
      [useAddItem(), { name: "x", quantity: "1", price: null }],
      [useCheckout(), { accountId: "a", categoryId: null, store: "" }],
    ]);
  });
});
