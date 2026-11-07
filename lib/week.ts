import { addDays, format, parseISO, startOfWeek } from "date-fns";

import type { Habit } from "@/lib/habits";
import { isScheduled } from "@/lib/habits";
import { formatPeso } from "@/lib/money";
import type { Todo } from "@/lib/todos";
import type { Strand, WeaveRow } from "@/lib/weave";

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");

/** Monday to Sunday of the week that holds `now`. */
export function weekDays(now: Date): Date[] {
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** 0 is Monday. */
export const todayIndex = (now: Date) => (now.getDay() + 6) % 7;

/** Over the daily share by up to 20% is watch, and more is over. */
export function moneyStrand(spent: number, dailyShare: number): Strand {
  if (spent <= dailyShare) return "good";
  return spent <= dailyShare * 1.2 ? "watch" : "over";
}

export function moneyRow(spentByDay: ReadonlyMap<string, number>, monthlyBudget: number, now: Date): WeaveRow {
  const days = weekDays(now);
  const share = monthlyBudget / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = dayKey(now);
  return {
    label: "Money",
    days: days.map((d) => (dayKey(d) > today ? "empty" : moneyStrand(spentByDay.get(dayKey(d)) ?? 0, share))),
    details: days.map((d) => `${formatPeso(spentByDay.get(dayKey(d)) ?? 0)} spent`),
  };
}

/** All done is good, and some left is watch. A past day with one left is over. */
export function todoRow(todos: readonly Pick<Todo, "due_at" | "completed_at">[], now: Date): WeaveRow {
  const today = dayKey(now);
  const parts = weekDays(now).map((d) => {
    const key = dayKey(d);
    const list = todos.filter((t) => t.due_at && dayKey(parseISO(t.due_at)) === key);
    const done = list.filter((t) => t.completed_at).length;
    let state: Strand = "empty";
    if (list.length > 0) {
      if (done === list.length) state = "good";
      else state = key < today ? "over" : "watch";
    }
    return { state, detail: `${done} of ${list.length} done` };
  });
  return { label: "Todos", days: parts.map((p) => p.state), details: parts.map((p) => p.detail) };
}

/** All done is good, half or more is watch, and less is over. */
export function habitRow(
  habits: readonly Pick<Habit, "id" | "schedule" | "weekdays">[],
  checks: ReadonlyMap<string, Set<string>>,
  now: Date,
): WeaveRow {
  const today = dayKey(now);
  const parts = weekDays(now).map((d) => {
    const key = dayKey(d);
    const planned = habits.filter((h) => isScheduled(h, d));
    const done = planned.filter((h) => checks.get(h.id)?.has(key)).length;
    let state: Strand = "empty";
    if (key <= today && planned.length > 0) {
      if (done === planned.length) state = "good";
      else state = done * 2 >= planned.length ? "watch" : "over";
    }
    return { state, detail: `${done} of ${planned.length} done` };
  });
  return { label: "Habits", days: parts.map((p) => p.state), details: parts.map((p) => p.detail) };
}
