import { differenceInMinutes, format, isSameDay, subDays } from "date-fns";

// Pure helpers for News, so the tests can run them without React Native.

/** "Just now", "25 min ago", "3 h ago", then "Yesterday, 9:10 PM" or "Nov 6, 9:10 PM". */
export function timeAgo(at: Date, now = new Date()): string {
  const minutes = Math.max(differenceInMinutes(now, at), 0);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (isSameDay(at, now) && minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  if (isSameDay(at, subDays(now, 1))) return `Yesterday, ${format(at, "h:mm a")}`;
  return format(at, "MMM d, h:mm a");
}

export type FeedState = { source: string; last_ok_at: string | null; last_error_at: string | null };

/** Feeds whose last run failed after their last good run, with the time of their last good stories. */
export function downFeeds(sync: readonly FeedState[]): { source: string; lastOk: string | null }[] {
  return sync
    .filter((s) => s.last_error_at && (!s.last_ok_at || s.last_error_at > s.last_ok_at))
    .map((s) => ({ source: s.source, lastOk: s.last_ok_at }));
}
