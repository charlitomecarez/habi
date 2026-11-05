import { describe, expect, it, vi } from "vitest";

import { buildReview, type Statement, type StatementRow } from "@/lib/import";
import type { Account, Category } from "@/lib/money";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

// Every row here is made up. Never paste a real statement into a fixture.
const account = (id: string, name: string): Account => ({
  id,
  name,
  kind: "bank",
  opening_balance: 0,
  currency: "PHP",
  sort_order: 0,
  balance: 0,
});
const accounts = [account("gotyme-id", "GoTyme"), account("gcash-id", "GCash")];
const categories: Category[] = [
  { id: "transport-id", name: "Transport", kind: "expense", sort_order: 0 },
  { id: "other-income-id", name: "Other income", kind: "income", sort_order: 0 },
];

const row = (over: Partial<StatementRow> = {}): StatementRow => ({
  occurredOn: "2026-10-10",
  kind: "expense",
  amount: 100,
  name: "Sample Shop",
  details: "Sample Shop",
  ref: "ref-1",
  otherBank: null,
  ...over,
});
const statement = (...rows: StatementRow[]): Statement => ({
  bank: "gotyme",
  from: "2026-10-01",
  to: "2026-10-31",
  opening: 0,
  closing: 0,
  credits: 0,
  debits: 0,
  rows,
});
const saved = (over: Record<string, unknown> = {}) =>
  ({
    id: "saved-id",
    kind: "expense",
    account_id: "gotyme-id",
    to_account_id: null,
    amount: 100,
    occurred_on: "2026-10-10",
    external_ref: null,
    ...over,
  }) as Parameters<typeof buildReview>[3][number];

const review = (
  rows: StatementRow[],
  existing: ReturnType<typeof saved>[] = [],
  history = [] as { name: string; categoryId: string | null }[],
) => buildReview(statement(...rows), "gotyme-id", accounts, existing, history, categories);

describe("buildReview", () => {
  it("leaves out a row that a past import saved", () => {
    const result = review([row()], [saved({ external_ref: "ref-1" })]);
    expect(result.rows).toEqual([]);
    expect(result.alreadySaved).toBe(1);
  });

  it("ticks a new row", () => {
    expect(review([row()]).rows[0]).toMatchObject({ status: "new", include: true, kind: "expense" });
  });

  it("unticks a row that looks like a typed expense, one day away", () => {
    const result = review([row()], [saved({ occurred_on: "2026-10-11" })]);
    expect(result.rows[0]).toMatchObject({ status: "duplicate", include: false });
  });

  it("does not call a row a duplicate two days away", () => {
    expect(review([row()], [saved({ occurred_on: "2026-10-12" })]).rows[0].status).toBe("new");
  });

  it("makes a transfer when the other bank is an account", () => {
    expect(review([row({ otherBank: "gcash" })]).rows[0]).toMatchObject({
      kind: "transfer",
      fromAccountId: "gotyme-id",
      toAccountId: "gcash-id",
      categoryId: null,
    });
  });

  it("reverses the transfer for money coming in", () => {
    expect(review([row({ otherBank: "gcash", kind: "income" })]).rows[0]).toMatchObject({
      fromAccountId: "gcash-id",
      toAccountId: "gotyme-id",
    });
  });

  it("keeps a normal row when the other bank has no account", () => {
    expect(review([row({ otherBank: "maribank" })]).rows[0].kind).toBe("expense");
  });

  it("pairs a transfer that the other statement saved, with no fee", () => {
    const pair = saved({ kind: "transfer", to_account_id: "gcash-id", external_ref: "other-ref" });
    expect(review([row({ otherBank: "gcash" })], [pair]).rows[0]).toMatchObject({
      status: "pair",
      pairId: "saved-id",
      include: false,
      fee: 0,
    });
  });

  it("ticks a pair that has a fee, and keeps the lower amount as received", () => {
    const pair = saved({ kind: "transfer", to_account_id: "gcash-id", amount: 85, external_ref: "other-ref" });
    expect(review([row({ otherBank: "gcash" })], [pair]).rows[0]).toMatchObject({
      status: "pair",
      include: true,
      fee: 15,
      received: 85,
    });
  });

  it("does not pair amounts that differ by more than the largest fee", () => {
    const pair = saved({ kind: "transfer", to_account_id: "gcash-id", amount: 40, external_ref: "other-ref" });
    expect(review([row({ otherBank: "gcash" })], [pair]).rows[0].status).toBe("new");
  });

  it("guesses the category from your history first, then from the rules", () => {
    const history = [{ name: "sample shop", categoryId: "past-id" }];
    expect(review([row()], [], history).rows[0].categoryId).toBe("past-id");
    expect(review([row({ name: "Grab ride" })]).rows[0].categoryId).toBe("transport-id");
    expect(review([row()]).rows[0].categoryId).toBeNull();
  });

  it("files interest under Other income, and leaves other income blank", () => {
    expect(review([row({ kind: "income", name: "Interest earned" })]).rows[0].categoryId).toBe("other-income-id");
    expect(review([row({ kind: "income", name: "Sample salary" })]).rows[0].categoryId).toBeNull();
  });
});
