import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";

import type { Account, Category, ExpenseName, TransactionKind } from "@/lib/money";
import { supabase } from "@/lib/supabase";
import type { Json, Tables } from "@/types/database";

export type Bank = "gotyme" | "gcash" | "maribank";

export const BANK_NAMES: Record<Bank, string> = { gotyme: "GoTyme", gcash: "GCash", maribank: "MariBank" };

export type StatementRow = {
  occurredOn: string;
  kind: "expense" | "income";
  amount: number;
  name: string;
  details: string;
  ref: string;
  otherBank: Bank | null;
};

export type Statement = {
  bank: Bank;
  from: string;
  to: string;
  opening: number;
  closing: number;
  credits: number;
  debits: number;
  rows: StatementRow[];
};

type Existing = Pick<
  Tables<"transactions">,
  "id" | "kind" | "account_id" | "to_account_id" | "amount" | "occurred_on" | "external_ref"
>;

export type ReviewRow = {
  ref: string;
  occurredOn: string;
  kind: TransactionKind;
  amount: number;
  name: string;
  categoryId: string | null;
  fromAccountId: string;
  toAccountId: string | null;
  include: boolean;
  status: "new" | "duplicate" | "pair";
  /** The saved transfer that this row completes. */
  pairId?: string;
  /** The received amount of the pair. */
  received?: number;
  fee?: number;
};

export type Review = { rows: ReviewRow[]; alreadySaved: number };

/** The largest gap between a sent and a received amount that still counts as one transfer. */
const MAX_TRANSFER_FEE = 50;

const CATEGORY_RULES: readonly [RegExp, string][] = [
  [/grab|angkas|joyride/i, "Transport"],
  [/meralco|manila water|maynilad|converge|pldt|globe|smart|pag-ibig|sss|philhealth|buy load/i, "Bills & utilities"],
  [/spotify|netflix|apple|anthropic|elevenlabs|youtube/i, "Subscriptions"],
  [/shopee|lazada|tiktok/i, "Shopping"],
];

const daysApart = (a: string, b: string) => Math.abs(differenceInCalendarDays(parseISO(a), parseISO(b)));

function guessCategory(row: StatementRow, history: readonly ExpenseName[], categories: readonly Category[]) {
  const byName = (name: string) => categories.find((c) => c.name === name && c.kind === row.kind)?.id ?? null;
  if (row.kind === "income") return /interest/i.test(row.name) ? byName("Other income") : null;
  const key = row.name.toLowerCase();
  const past = history.find((h) => h.name.toLowerCase() === key && h.categoryId);
  if (past) return past.categoryId;
  const rule = CATEGORY_RULES.find(([pattern]) => pattern.test(row.name));
  return rule ? byName(rule[1]) : null;
}

/** Turns statement rows into review rows: repeats go, transfers pair up, duplicates start unticked. */
export function buildReview(
  statement: Statement,
  accountId: string,
  accounts: readonly Account[],
  existing: readonly Existing[],
  history: readonly ExpenseName[],
  categories: readonly Category[],
): Review {
  const savedRefs = new Set(existing.map((e) => e.external_ref));
  const fresh = statement.rows.filter((r) => !savedRefs.has(r.ref));

  const rows = fresh.map((row): ReviewRow => {
    const base = {
      ref: row.ref,
      occurredOn: row.occurredOn,
      amount: row.amount,
      name: row.name,
    };
    const other = row.otherBank
      ? accounts.find((a) => a.name.toLowerCase() === BANK_NAMES[row.otherBank!].toLowerCase() && a.id !== accountId)
      : undefined;

    if (other) {
      const fromAccountId = row.kind === "expense" ? accountId : other.id;
      const toAccountId = row.kind === "expense" ? other.id : accountId;
      const transfer = { ...base, kind: "transfer" as const, categoryId: null, fromAccountId, toAccountId };
      const pair = existing.find(
        (e) =>
          e.kind === "transfer" &&
          e.account_id === fromAccountId &&
          e.to_account_id === toAccountId &&
          daysApart(e.occurred_on, row.occurredOn) <= 1 &&
          Math.abs(e.amount - row.amount) <= MAX_TRANSFER_FEE,
      );
      if (!pair) return { ...transfer, include: true, status: "new" };
      const fee = Math.round(Math.abs(pair.amount - row.amount) * 100) / 100;
      return {
        ...transfer,
        include: fee > 0,
        status: "pair",
        pairId: pair.id,
        received: Math.min(pair.amount, row.amount),
        fee,
      };
    }

    const duplicate = existing.some(
      (e) =>
        e.external_ref === null &&
        e.account_id === accountId &&
        e.kind === row.kind &&
        e.amount === row.amount &&
        daysApart(e.occurred_on, row.occurredOn) <= 1,
    );
    return {
      ...base,
      kind: row.kind,
      categoryId: guessCategory(row, history, categories),
      fromAccountId: accountId,
      toAccountId: null,
      include: !duplicate,
      status: duplicate ? "duplicate" : "new",
    };
  });

  return { rows, alreadySaved: statement.rows.length - fresh.length };
}

function toPayload(row: ReviewRow) {
  if (row.pairId) {
    return {
      pair_id: row.pairId,
      amount: row.received,
      fee: row.fee,
      fee_account_id: row.fromAccountId,
      occurred_on: row.occurredOn,
      ref: row.ref,
    };
  }
  const transfer = row.kind === "transfer";
  return {
    kind: row.kind,
    account_id: row.fromAccountId,
    to_account_id: row.toAccountId,
    category_id: row.categoryId,
    amount: row.amount,
    occurred_on: row.occurredOn,
    merchant: transfer ? null : row.name,
    note: transfer ? row.name : null,
    ref: row.ref,
  };
}

/** Says what failed. Only a request that never reached the server is a connection problem. */
export async function statementError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    return body?.error ?? "The server could not finish reading this PDF. Try a statement with fewer pages.";
  }
  if (error instanceof FunctionsRelayError) {
    return "The server could not finish reading this PDF. Try a statement with fewer pages.";
  }
  return "Could not reach the server. Check your connection.";
}

/** Sends the PDF to the import-statement function, then loads the rows to compare it with. */
export function useReadStatement() {
  return useMutation({
    mutationFn: async (form: FormData) => {
      const { data, error } = await supabase.functions.invoke<Statement>("import-statement", { body: form });
      if (error) throw new Error(await statementError(error));
      if (!data) throw new Error("Could not read this statement.");

      const day = (date: string, shift: number) => format(addDays(parseISO(date), shift), "yyyy-MM-dd");
      const { data: existing, error: loadError } = await supabase
        .from("transactions")
        .select("id, kind, account_id, to_account_id, amount, occurred_on, external_ref")
        .gte("occurred_on", day(data.from, -1))
        .lte("occurred_on", day(data.to, 1));
      if (loadError) throw loadError;
      return { statement: data, existing };
    },
  });
}

/** Saves the ticked rows. Returns how many transactions were added. */
export function useSaveImport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ReviewRow[]) => {
      const { data, error } = await supabase.rpc("import_transactions", {
        p_rows: rows.map(toPayload) as unknown as Json,
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["money"] }),
  });
}
