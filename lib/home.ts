import { differenceInCalendarDays, format, isToday, parseISO, startOfDay } from "date-fns";
import type { Href } from "expo-router";

import { debtStatus, type Debt } from "@/lib/debts";
import { formatPeso, type Subscription } from "@/lib/money";
import { occurrenceText, dateLabel, type Person, type PersonDate } from "@/lib/people";
import { isOverdue, type Todo } from "@/lib/todos";
import { dueText, type ServiceDue } from "@/lib/vehicles";

export type AttentionStatus = "Overdue" | "Today" | "Due soon";
export type AttentionModule = "vehicle" | "todo" | "bill" | "medicine" | "debt" | "date";

export type AttentionItem = {
  key: string;
  module: AttentionModule;
  status: AttentionStatus;
  title: string;
  detail: string;
  href: Href;
  /** Days until it is due. Negative when late. Sorts inside a status. */
  days: number;
};

export type DoseDue = { id: string; medicine_name: string; dose: string; scheduled_at: string; status: string };

export type AttentionInput = {
  services: readonly ServiceDue[];
  /** Open todos for today, and any that are late. */
  todos: readonly Todo[];
  bills: readonly Subscription[];
  doses: readonly DoseDue[];
  debts: readonly Debt[];
  people: readonly Person[];
  dates: readonly PersonDate[];
};

const DUE_SOON_DAYS = 7;
const STATUS_ORDER: Record<AttentionStatus, number> = { Overdue: 0, Today: 1, "Due soon": 2 };

const dayStatus = (days: number): AttentionStatus => (days < 0 ? "Overdue" : days === 0 ? "Today" : "Due soon");

function serviceItem(s: ServiceDue): AttentionItem {
  const overdue = s.status === "overdue";
  return {
    key: `service-${s.vehicleServiceId}`,
    module: "vehicle",
    status: overdue ? "Overdue" : "Due soon",
    title: s.item,
    detail: `Vehicle · ${dueText(s)}`,
    href: { pathname: "/vehicle/log-service", params: { serviceId: s.vehicleServiceId } },
    days: s.daysRemaining ?? (overdue ? -1 : 1),
  };
}

function todoItem(todo: Todo, now: Date): AttentionItem {
  const overdue = isOverdue(todo, now);
  const remind = todo.remind_at ? new Date(todo.remind_at) : null;
  const due = todo.due_at ? new Date(todo.due_at) : null;
  const detail = remind
    ? `reminder at ${format(remind, "h:mm a")}${isToday(remind) ? " today" : `, ${format(remind, "MMM d")}`}`
    : due
      ? `due ${isToday(due) ? "today" : format(due, "MMM d")}`
      : "no date";
  return {
    key: `todo-${todo.id}`,
    module: "todo",
    status: overdue ? "Overdue" : "Today",
    title: todo.title,
    detail: `Todo · ${detail}`,
    href: { pathname: "/todo/[id]", params: { id: todo.id } },
    days: overdue ? -1 : 0,
  };
}

function billItem(bill: Subscription, days: number): AttentionItem {
  const when = format(parseISO(bill.next_billing_on), "MMM d");
  return {
    key: `bill-${bill.id}`,
    module: "bill",
    status: dayStatus(days),
    title: bill.name,
    detail: `Money · ${bill.amount === null ? `Due ${when}` : `${formatPeso(bill.amount)} · ${when}`}`,
    href: "/money/bills",
    days,
  };
}

function doseItem(dose: DoseDue, now: Date): AttentionItem {
  const at = new Date(dose.scheduled_at);
  const late = at < now;
  return {
    key: `dose-${dose.id}`,
    module: "medicine",
    status: late ? "Overdue" : "Today",
    title: dose.medicine_name,
    detail: `Health · ${dose.dose ? `${dose.dose} · ` : ""}${format(at, "h:mm a")}`,
    href: "/health",
    days: late ? -1 : 0,
  };
}

function debtItem(debt: Debt, days: number, status: string): AttentionItem {
  const owed = debt.direction === "owed_to_me";
  return {
    key: `debt-${debt.id}`,
    module: "debt",
    status: dayStatus(days),
    title: owed ? `${debt.person_name} owes you` : `You owe ${debt.person_name}`,
    detail: `Debts · ${formatPeso(debt.balance)} · ${status}`,
    href: { pathname: "/debts/[id]", params: { id: debt.id } },
    days,
  };
}

function dateItem(date: PersonDate, name: string, now: Date): AttentionItem | null {
  const { days, when } = occurrenceText(date, now);
  if (days > DUE_SOON_DAYS) return null;
  return {
    key: `date-${date.id}`,
    module: "date",
    status: dayStatus(days),
    title: `${name}'s ${dateLabel(date).toLowerCase()}`,
    detail: `People · ${when}`,
    href: { pathname: "/people/[id]", params: { id: date.person_id } },
    days,
  };
}

/** One list of what needs you, from every module: late first, then today, then due soon. */
export function buildAttention(input: AttentionInput, now = new Date()): AttentionItem[] {
  const today = startOfDay(now);
  const daysTo = (date: string) => differenceInCalendarDays(parseISO(date), today);
  const nameById = new Map(input.people.map((p) => [p.id, p.name]));

  const items: AttentionItem[] = [
    ...input.services.filter((s) => s.status === "overdue" || s.status === "due_soon").map(serviceItem),
    ...input.todos.filter((t) => !t.completed_at).map((t) => todoItem(t, now)),
    ...input.bills
      .filter((b) => b.kind === "bill" && daysTo(b.next_billing_on) <= DUE_SOON_DAYS)
      .map((b) => billItem(b, daysTo(b.next_billing_on))),
    ...input.doses.filter((d) => d.status === "pending").map((d) => doseItem(d, now)),
    ...input.debts
      .filter((d) => d.balance > 0 && d.due_on !== null && daysTo(d.due_on) <= DUE_SOON_DAYS)
      .map((d) => debtItem(d, daysTo(d.due_on!), debtStatus(d, now).text)),
    ...input.dates.flatMap((d) => dateItem(d, nameById.get(d.person_id) ?? "Someone", now) ?? []),
  ];

  return items.sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.days - b.days || a.title.localeCompare(b.title),
  );
}

/** The sentence on the Today card. Due-soon items wait, so only late and today items count. */
export function todaySentence(items: readonly AttentionItem[]): string {
  const count = items.filter((i) => i.status !== "Due soon").length;
  if (count === 0) return "Nothing needs you today";
  return count === 1 ? "1 thing needs you today" : `${count} things need you today`;
}

/** Bills due in the next 7 days, and any that are late, in PHP. */
export function billsThisWeek(bills: readonly Subscription[], now = new Date()): number {
  const today = startOfDay(now);
  return bills
    .filter((b) => b.kind === "bill" && differenceInCalendarDays(parseISO(b.next_billing_on), today) <= DUE_SOON_DAYS)
    .reduce((total, b) => total + (b.amount ?? 0) * (b.rateToPhp ?? 1), 0);
}
