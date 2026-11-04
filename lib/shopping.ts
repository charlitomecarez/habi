import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/types/database";

export type ShoppingItem = Omit<Tables<"shopping_items">, "user_id">;
export type PastItem = Pick<Tables<"shopping_history">, "name" | "last_price" | "times">;

const SHOPPING_KEY = ["shopping"] as const;

export function useShopping() {
  return useQuery({
    queryKey: SHOPPING_KEY,
    queryFn: async () => {
      const [items, history] = await Promise.all([
        supabase.from("shopping_items").select("id, name, quantity, price, ticked, created_at").order("created_at"),
        supabase
          .from("shopping_history")
          .select("name, last_price, times")
          .order("times", { ascending: false })
          .limit(200),
      ]);
      if (items.error) throw items.error;
      if (history.error) throw history.error;
      return { items: items.data as ShoppingItem[], history: history.data as PastItem[] };
    },
  });
}

type Data = { items: ShoppingItem[]; history: PastItem[] };

function useOptimistic() {
  const client = useQueryClient();
  return {
    client,
    async apply(change: (items: ShoppingItem[]) => ShoppingItem[]) {
      await client.cancelQueries({ queryKey: SHOPPING_KEY });
      const previous = client.getQueryData<Data>(SHOPPING_KEY);
      if (previous) client.setQueryData<Data>(SHOPPING_KEY, { ...previous, items: change(previous.items) });
      return { previous };
    },
    restore(context?: { previous?: Data }) {
      if (context?.previous) client.setQueryData(SHOPPING_KEY, context.previous);
    },
    settle: () => client.invalidateQueries({ queryKey: SHOPPING_KEY }),
  };
}

export function useAddItem() {
  const o = useOptimistic();
  return useMutation({
    mutationFn: async (i: { name: string; quantity: string; price: number | null }) => {
      const { error } = await supabase.from("shopping_items").insert(i);
      if (error) throw error;
    },
    onSettled: o.settle,
  });
}

export function useUpdateItem() {
  const o = useOptimistic();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<ShoppingItem, "name" | "quantity" | "price" | "ticked">>;
    }) => {
      const { error } = await supabase.from("shopping_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, patch }) => o.apply((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i))),
    onError: (_e, _v, c) => o.restore(c),
    onSettled: o.settle,
  });
}

export function useRemoveItem() {
  const o = useOptimistic();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shopping_items").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => o.apply((items) => items.filter((i) => i.id !== id)),
    onError: (_e, _v, c) => o.restore(c),
    onSettled: o.settle,
  });
}

/** One expense with the total of the ticked items, then they leave the list. */
export function useCheckout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (c: { accountId: string; categoryId: string | null; store: string }) => {
      const { data, error } = await supabase.rpc("shopping_checkout", {
        p_account_id: c.accountId,
        p_category_id: c.categoryId,
        p_store: c.store,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: SHOPPING_KEY });
      client.invalidateQueries({ queryKey: ["money"] });
    },
  });
}
