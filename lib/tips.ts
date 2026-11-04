import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, format } from "date-fns";

import { supabase } from "@/lib/supabase";

export type Tip = { topic: string; tip: string; bundled: boolean };

// Shown when today's tip from the daily-tip function is missing (the call failed or has not run).
const BUNDLED: { topic: string; tip: string }[] = [
  { topic: "focus", tip: "Pick the one task that would make today a good day, and do it before you open messages." },
  { topic: "money", tip: "Before you buy something over ₱1,000, wait one day. If you still want it tomorrow, buy it." },
  { topic: "health", tip: "Drink a glass of water before each meal today. It is the easiest habit to keep." },
  { topic: "work", tip: "Write tomorrow's first task before you stop working today, so you start fast." },
  { topic: "relationships", tip: "Send one person a message today about something they did that you liked." },
  { topic: "life", tip: "Put your phone in another room for the first 30 minutes after you wake up." },
  { topic: "money", tip: "Check one subscription today. If you did not use it this month, cancel it." },
  { topic: "health", tip: "Take a 10-minute walk after lunch. It helps your energy for the afternoon." },
  {
    topic: "focus",
    tip: "Close every tab you are not using right now. Fewer things in view, fewer things pulling at you.",
  },
  { topic: "work", tip: "When a task takes less than two minutes, do it now instead of writing it down." },
  { topic: "relationships", tip: "Ask someone a question today and listen to the whole answer before you reply." },
  { topic: "life", tip: "Tidy one small spot, like your desk or bag. Small order makes the day feel lighter." },
];

/** The bundled tip for a day: the same on every device that day. */
export function bundledTip(day = new Date()): Tip {
  const i = Math.abs(differenceInCalendarDays(day, new Date(2026, 0, 1))) % BUNDLED.length;
  return { ...BUNDLED[i], bundled: true };
}

/** Today's tip, or a bundled one when the daily-tip function has not stored one. */
export function useDailyTip() {
  const today = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["daily-tip", today],
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<Tip> => {
      const { data, error } = await supabase.from("daily_tips").select("topic, tip").eq("on_date", today).maybeSingle();
      if (error || !data) return bundledTip();
      return { topic: data.topic, tip: data.tip, bundled: false };
    },
  });
}

export function topicLabel(topic: string): string {
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}
