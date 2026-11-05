import { describe, expect, it, vi } from "vitest";

import { billsThisWeek, buildAttention, todaySentence, type AttentionInput } from "@/lib/home";
import type { Debt } from "@/lib/debts";
import type { Subscription } from "@/lib/money";
import type { PersonDate } from "@/lib/people";
import type { Todo } from "@/lib/todos";
import type { ServiceDue } from "@/lib/vehicles";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/photos", () => ({}));

const NOW = new Date(2026, 10, 5, 9, 0);

const bill = (over: Partial<Subscription> = {}) =>
  ({
    id: "b1",
    name: "Electric bill",
    kind: "bill",
    amount: 1850,
    next_billing_on: "2026-11-03",
    rateToPhp: 1,
    ...over,
  }) as Subscription;
const service = (over: Partial<ServiceDue> = {}): ServiceDue => ({
  vehicleServiceId: "s1",
  item: "Engine oil",
  status: "due_soon",
  nextDueKm: 13000,
  nextDueOn: null,
  kmRemaining: 120,
  daysRemaining: null,
  sortOrder: 1,
  ...over,
});
const todo = (over: Partial<Todo> = {}) =>
  ({
    id: "t1",
    title: "Renew licence",
    completed_at: null,
    due_at: "2026-11-05T02:00:00Z",
    remind_at: null,
    ...over,
  }) as Todo;
const debt = (over: Partial<Debt> = {}) =>
  ({
    id: "d1",
    person_name: "Sample",
    direction: "i_owe",
    amount: 500,
    paid: 0,
    balance: 500,
    due_on: "2026-11-06",
    ...over,
  }) as Debt;
const birthday = (over: Partial<PersonDate> = {}): PersonDate => ({
  id: "p1",
  person_id: "person-1",
  kind: "birthday",
  label: null,
  month: 11,
  day: 7,
  year: null,
  ...over,
});
const dose = (over = {}) => ({
  id: "m1",
  medicine_name: "Vitamin C",
  dose: "1 tablet",
  scheduled_at: new Date(2026, 10, 5, 8, 0).toISOString(),
  status: "pending",
  ...over,
});

const input = (over: Partial<AttentionInput> = {}): AttentionInput => ({
  services: [],
  todos: [],
  bills: [],
  doses: [],
  debts: [],
  people: [{ id: "person-1", name: "Ana", note: null }],
  dates: [],
  ...over,
});

describe("buildAttention", () => {
  it("merges every module into one list", () => {
    const items = buildAttention(
      input({
        services: [service()],
        todos: [todo()],
        bills: [bill()],
        doses: [dose()],
        debts: [debt()],
        dates: [birthday()],
      }),
      NOW,
    );
    expect(items.map((i) => i.module).sort()).toEqual(["bill", "date", "debt", "medicine", "todo", "vehicle"]);
  });

  it("puts late items first, then today, then due soon", () => {
    const items = buildAttention(input({ services: [service()], todos: [todo()], bills: [bill()] }), NOW);
    expect(items.map((i) => i.status)).toEqual(["Overdue", "Today", "Due soon"]);
  });

  it("names a late bill Overdue, with its amount", () => {
    expect(buildAttention(input({ bills: [bill()] }), NOW)[0]).toMatchObject({
      status: "Overdue",
      title: "Electric bill",
    });
    expect(buildAttention(input({ bills: [bill()] }), NOW)[0].detail).toContain("₱1,850");
  });

  it("leaves out a bill past the next 7 days, and a subscription", () => {
    const far = bill({ next_billing_on: "2026-11-20" });
    const subscription = bill({ kind: "subscription" });
    expect(buildAttention(input({ bills: [far, subscription] }), NOW)).toEqual([]);
  });

  it("handles a bill with no amount yet", () => {
    expect(buildAttention(input({ bills: [bill({ amount: null })] }), NOW)[0].detail).toBe("Money · Due Nov 3");
  });

  it("shows a near birthday with the person's name", () => {
    expect(buildAttention(input({ dates: [birthday()] }), NOW)[0]).toMatchObject({
      status: "Due soon",
      title: "Ana's birthday",
    });
  });

  it("calls a birthday today Today, and leaves out one past a week", () => {
    expect(buildAttention(input({ dates: [birthday({ day: 5 })] }), NOW)[0].status).toBe("Today");
    expect(buildAttention(input({ dates: [birthday({ day: 20 })] }), NOW)).toEqual([]);
  });

  it("shows a pending dose by time, and hides a taken one", () => {
    const later = dose({ id: "m2", scheduled_at: new Date(2026, 10, 5, 20, 0).toISOString() });
    const taken = dose({ id: "m3", status: "taken" });
    const items = buildAttention(input({ doses: [dose(), later, taken] }), NOW);
    expect(items.map((i) => i.status)).toEqual(["Overdue", "Today"]);
  });

  it("words a debt by direction, and hides a paid one or one with no date", () => {
    const owed = debt({ id: "d2", direction: "owed_to_me", person_name: "Ben" });
    const items = buildAttention(
      input({ debts: [debt(), owed, debt({ id: "d3", balance: 0 }), debt({ id: "d4", due_on: null })] }),
      NOW,
    );
    expect(items.map((i) => i.title).sort()).toEqual(["Ben owes you", "You owe Sample"]);
  });

  it("hides a finished todo and a service that is not due", () => {
    const done = todo({ completed_at: "2026-11-05T01:00:00Z" });
    const fine = service({ status: "ok" as ServiceDue["status"] });
    expect(buildAttention(input({ todos: [done], services: [fine] }), NOW)).toEqual([]);
  });
});

describe("todaySentence", () => {
  it("counts late and today items, and not due soon ones", () => {
    const items = buildAttention(input({ services: [service()], todos: [todo()], bills: [bill()] }), NOW);
    expect(todaySentence(items)).toBe("2 things need you today");
    expect(todaySentence(items.slice(0, 1))).toBe("1 thing needs you today");
    expect(todaySentence(items.slice(2))).toBe("Nothing needs you today");
  });
});

describe("billsThisWeek", () => {
  it("adds bills in PHP, and skips far bills and subscriptions", () => {
    const total = billsThisWeek(
      [
        bill(),
        bill({ id: "b2", amount: 10, rateToPhp: 58, next_billing_on: "2026-11-07" }),
        bill({ id: "b3", amount: null }),
        bill({ id: "b4", next_billing_on: "2026-12-01" }),
        bill({ id: "b5", kind: "subscription" }),
      ],
      NOW,
    );
    expect(total).toBe(1850 + 580);
  });
});
