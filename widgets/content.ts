import { format } from "date-fns";

import { sleepMinutes, sleepStrand, sleepText, type SleepLog } from "@/lib/sleep";

export type WidgetLine = { lead: string; note: string };

const SLEEP_WORD = { good: "Good", watch: "Watch", over: "Under 6 hours", empty: "" } as const;

/** Last night, in words. No entry says so, with no personal data. */
export function sleepLine(log: SleepLog, now: Date): WidgetLine {
  const entry = log[format(now, "yyyy-MM-dd")];
  if (!entry) return { lead: "Not logged", note: "Last night. Tap to log your sleep." };
  const minutes = sleepMinutes(entry);
  return { lead: sleepText(minutes), note: `Last night · ${SLEEP_WORD[sleepStrand(minutes)]}` };
}

function hours(ms: number): string {
  const minutes = Math.round(ms / 60000);
  const h = Math.floor(minutes / 60);
  return h ? `${h} h ${minutes % 60} min` : `${minutes} min`;
}

/** Today against the 7-day average. It shows no app names, because anyone can see a home screen. */
export function screenTimeLine(todayMs: number | null, averageMs: number): WidgetLine {
  if (todayMs === null) return { lead: "Off", note: "Tap to turn on usage access." };
  const gap = hours(Math.abs(todayMs - averageMs));
  return { lead: hours(todayMs), note: todayMs <= averageMs ? `${gap} under average` : `${gap} over average` };
}

export const SIGNED_OUT: WidgetLine = { lead: "my-app", note: "Open the app to sign in." };
