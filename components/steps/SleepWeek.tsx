import { format, startOfWeek, subWeeks } from "date-fns";
import { useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";

import { BarChart } from "@/components/ui/BarChart";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { sleepText, type SleepEntry, type SleepLog } from "@/lib/sleep";
import { scoreStatus, sleepWeek } from "@/lib/sleep-score";

type Week = "this" | "last";

const WEEKS = [
  { value: "this", label: "This week" },
  { value: "last", label: "Last week" },
] as const;

const GOAL_HOURS = 7;
// The same scale at which DataRow stacks: the three week numbers go one under another.
const STACK_SCALE = 1.3;
const TONE_TEXT = { good: "text-good", watch: "text-watch", over: "text-over" } as const;
const timeText = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return format(new Date(2000, 0, 1, h, m), "h:mm a");
};

/** This week and Last week of sleep: a bar for each night, the averages, and a row for each night. */
export function SleepWeek({
  log,
  loading,
  now,
  onEdit,
}: {
  log?: SleepLog;
  loading: boolean;
  now: Date;
  onEdit: (day: Date, entry?: SleepEntry) => void;
}) {
  const [week, setWeek] = useState<Week>("this");
  const stacked = useWindowDimensions().fontScale >= STACK_SCALE;
  const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
  const monday = week === "this" ? thisMonday : subWeeks(thisMonday, 1);
  const data = sleepWeek(log ?? {}, monday, now);
  const nights = data.nights;
  const today = format(now, "yyyy-MM-dd");
  const days = Array.from({ length: 7 }, (_, i) => nights[i]);
  const bars = days.map((n) => (n ? (n.minutes ?? 0) / 60 : null));
  const tones = days.map((n) => (n?.score !== undefined ? scoreStatus(n.score).tone : undefined));
  const weekStatus = data.count ? scoreStatus(data.score) : undefined;

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        {week === "this" ? "This week" : "Last week"}
      </Text>
      <Segmented label="Week" options={WEEKS} value={week} onChange={setWeek} />
      {loading ? (
        <Skeleton layout="detail" rows={3} />
      ) : !data.count ? (
        <EmptyState
          drawing="calendar"
          title={week === "this" ? "No nights yet this week" : "No nights last week"}
          body={
            week === "this"
              ? "I add each night when you open the app in the morning. Last week shows your nights before Monday."
              : "I keep 30 days of sleep on this phone. Last week had none."
          }
        />
      ) : (
        <>
          <BarChart
            label={`Hours of sleep each night. Average ${sleepText(data.average)}.`}
            values={bars}
            labels={["M", "T", "W", "T", "F", "S", "S"]}
            tones={tones}
            goal={GOAL_HOURS}
          />
          <View className={stacked ? "gap-3" : "flex-row gap-4"}>
            <View className={stacked ? "" : "min-w-0 flex-1"}>
              <Text className="font-bold text-row-title text-ink">{sleepText(data.average)}</Text>
              <Text className="font-sans text-caption text-ink-muted">average</Text>
            </View>
            <View className={stacked ? "" : "min-w-0 flex-1"}>
              <Text className="font-bold text-row-title text-ink">{data.score}</Text>
              <Text className="font-sans text-caption text-ink-muted">
                {weekStatus ? (
                  <Text className={`font-semibold ${TONE_TEXT[weekStatus.tone]}`}>{weekStatus.label}</Text>
                ) : null}{" "}
                score
              </Text>
            </View>
            <View className={stacked ? "" : "min-w-0 flex-1"}>
              <Text className="font-bold text-row-title text-ink">{data.count}</Text>
              <Text className="font-sans text-caption text-ink-muted">{data.count === 1 ? "night" : "nights"}</Text>
            </View>
          </View>
          <Text className="font-sans text-caption text-ink-muted">
            Usual bedtime {data.usualBed} · usual wake {data.usualWake}
          </Text>
          <View>
            {nights.map((n, i) => {
              const isToday = format(n.day, "yyyy-MM-dd") === today;
              const status = n.score !== undefined ? scoreStatus(n.score) : undefined;
              const detail = n.entry
                ? `${timeText(n.entry.bed)} to ${timeText(n.entry.wake)}${n.entry.source === "screen" ? " · Screen" : ""}`
                : isToday
                  ? "Not yet"
                  : "Not logged";
              return (
                <DataRow
                  key={n.day.toISOString()}
                  title={format(n.day, "EEEE")}
                  detail={detail}
                  value={n.score !== undefined ? String(n.score) : undefined}
                  status={status}
                  onPress={() => onEdit(n.day, n.entry)}
                  last={i === nights.length - 1}
                />
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}
