import { format, subDays } from "date-fns";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppRow } from "@/components/screen-time/AppRow";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { openUsageSettings, useScreenTime, useUsageAccess, useWeekUsage } from "@/lib/screen-time";
import { appList, duration, type UsageRow } from "@/lib/screen-time-list";

type Range = "today" | "week";
const RANGES: readonly { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
];

function AppList({ apps }: { apps: readonly UsageRow[] }) {
  const { rows, folded } = appList(apps);
  return (
    <View>
      <Text accessibilityRole="header" className="py-2 font-semibold text-heading text-ink">
        Every app · {rows.length + (folded?.count ?? 0)}
      </Text>
      {rows.map((a) => (
        <AppRow key={a.packageName} label={a.label} totalMs={a.totalMs} share={a.share} />
      ))}
      {folded ? (
        <View className="flex-row justify-between gap-3 py-2">
          <Text className="min-w-0 shrink font-semibold text-label text-ink">
            {folded.count} {folded.count === 1 ? "app" : "apps"} under a minute
          </Text>
          <Text className="font-sans text-label text-ink-muted">{duration(folded.totalMs)}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="gap-3">
      <Notice tone="danger">Could not read screen time. Android did not answer.</Notice>
      <Button label="Try again" variant="secondary" size="input" onPress={onRetry} />
    </View>
  );
}

/** Every app used today or this week. Read-only, so it has no primary action. The data stays on the phone. */
export default function ScreenTimeScreen() {
  const access = useUsageAccess();
  const [range, setRange] = useState<Range>("today");
  const [today] = useState(() => new Date());
  const day = useScreenTime(today, access && range === "today");
  const week = useWeekUsage(access && range === "week");

  const subtitle =
    range === "today"
      ? format(today, "EEEE, MMM d")
      : week.data
        ? `${format(week.data.start, "MMM d")} to ${format(today, "MMM d")}`
        : undefined;

  if (!access) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Screen time" tone="daily" />
        <View className="flex-1 justify-center gap-4 px-5">
          <EmptyState
            drawing="box"
            title="Turn on usage access"
            body="Android shows me how long you use each app. It stays on this phone."
          />
          <Button label="Turn on usage access" onPress={openUsageSettings} />
        </View>
      </SafeAreaView>
    );
  }

  const current = range === "today" ? day : week;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Screen time" subtitle={subtitle} tone="daily" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <Segmented label="Range" options={RANGES} value={range} onChange={setRange} />
        {current.isPending ? (
          <Skeleton layout="home" />
        ) : current.error ? (
          <Failed onRetry={() => void current.refetch()} />
        ) : range === "today" && day.data ? (
          day.data.day.totalMs === 0 ? (
            <EmptyState
              drawing="box"
              title="No screen time yet today"
              body="I show each app once you use it. The day starts at midnight."
            />
          ) : (
            <>
              <View className="gap-1">
                <Text className="font-bold text-display text-ink">{duration(day.data.day.totalMs)}</Text>
                <Text
                  className={`font-semibold text-caption ${day.data.day.totalMs <= day.data.weekMs / 7 ? "text-good" : "text-over"}`}
                >
                  {duration(Math.abs(day.data.day.totalMs - day.data.weekMs / 7))}{" "}
                  {day.data.day.totalMs <= day.data.weekMs / 7 ? "under average" : "over average"}
                </Text>
              </View>
              <BarChart
                label={`Screen time for the last 7 days. Average ${duration(day.data.weekMs / 7)} a day.`}
                values={day.data.dailyMs}
                labels={Array.from({ length: 7 }, (_, i) => format(subDays(today, 6 - i), "EEEEE"))}
                highlight={6}
              />
              <AppList apps={day.data.day.apps} />
            </>
          )
        ) : range === "week" && week.data ? (
          <>
            <View className="gap-1">
              <Text className="font-bold text-display text-ink">{duration(week.data.totalMs)}</Text>
              <Text className="font-sans text-caption text-ink-muted">
                Average {duration(week.data.totalMs / week.data.days)} a day
              </Text>
            </View>
            <AppList apps={week.data.apps} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
