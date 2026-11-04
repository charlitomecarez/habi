import { addDays, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";

/** One cell of a month grid. Null for a day outside the month. */
export type CalendarDay = { date: string; day: number } | null;

/** Weeks start on Sunday, as on Philippine calendars. */
export const WEEKDAYS = [
  { short: "S", long: "Sunday" },
  { short: "M", long: "Monday" },
  { short: "T", long: "Tuesday" },
  { short: "W", long: "Wednesday" },
  { short: "T", long: "Thursday" },
  { short: "F", long: "Friday" },
  { short: "S", long: "Saturday" },
] as const;

/** The month as rows of 7 days, Sunday first, with null for the days of other months. */
export function monthWeeks(month: Date): CalendarDay[][] {
  const last = endOfMonth(month);
  const weeks: CalendarDay[][] = [];
  let cursor = startOfWeek(startOfMonth(month));
  while (cursor <= last) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isSameMonth(cursor, month) ? { date: format(cursor, "yyyy-MM-dd"), day: cursor.getDate() } : null);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
