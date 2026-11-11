import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdviceList, HealthCheckSection, useAdvice } from "@/components/steps/HealthCheck";
import { SleepSheet } from "@/components/steps/SleepSheet";
import { SleepWeek } from "@/components/steps/SleepWeek";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { useHealthDaysSync } from "@/lib/health-check";
import { openHealthConnect } from "@/lib/health-connect";
import { sleepMinutes, sleepStrand, sleepText, useSleepLog, type SleepEntry } from "@/lib/sleep";
import { stepsAverage, useAllowSleepWeight, useAllowSteps, useSteps } from "@/lib/steps";

// The sleep strand: 7 hours or more is good, 6 to 7 is short, under 6 is too short.
const SLEEP_STATUS = {
  good: { label: "Good", tone: "good" },
  watch: { label: "Short", tone: "watch" },
  over: { label: "Too short", tone: "over" },
  empty: undefined,
} as const;

export default function StepsScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const colors = useColors();
  const now = new Date();
  const steps = useSteps();
  const allow = useAllowSteps();
  const allowMore = useAllowSleepWeight();
  const sleep = useSleepLog();
  // The night that the sheet edits: today by default, or a night from the week.
  const [editing, setEditing] = useState<{ day: Date; entry?: SleepEntry } | null>(null);
  const advice = useAdvice(now);
  useHealthDaysSync();
  const sent = advice.state.kind !== "off";
  const where = sent ? "It also goes to your account for the health check." : "It stays on this phone.";
  const [asked, setAsked] = useState(false);

  const access = steps.data?.access ?? false;
  const week = steps.data?.week ?? [];
  const today = week[week.length - 1] ?? 0;
  const entry = sleep.data?.[format(now, "yyyy-MM-dd")];
  const minutes = entry ? sleepMinutes(entry) : 0;
  const editToday = () => setEditing({ day: now, entry });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader scrollY={scrollY} title="Steps and sleep" subtitle="Today" tone="daily" />
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {/* After 6 PM, the advice is the news of the evening, so it goes on top. */}
        {advice.state.kind === "today" ? (
          <AdviceList title="Today's advice" insight={advice.state.insight} time="6:00 PM" />
        ) : null}
        {steps.isPending ? <Skeleton layout="home" /> : null}

        {!steps.isPending && !access && !asked ? (
          <View className="gap-3">
            <Text className="font-bold text-title text-ink">See your steps on Home</Text>
            <Text className="font-sans text-body text-ink-muted">
              Habi reads your steps, sleep and weight from Health Connect. Steps and sleep stay on this phone, unless
              you turn on the 6 PM health check. Your weight saves to your account, like a weight you type.
            </Text>
            <Button
              label="Allow steps"
              loading={allow.isPending}
              onPress={() => allow.mutate(undefined, { onSettled: () => setAsked(true) })}
            />
            <Button label="Read how it works" variant="secondary" onPress={() => router.push("/steps/how")} />
          </View>
        ) : null}

        {!steps.isPending && !access && asked ? (
          <View className="gap-3">
            <Text className="font-bold text-title text-ink">Steps are off</Text>
            <Text className="font-sans text-body text-ink-muted">
              You refused access. Home hides the steps row. You can still log sleep.
            </Text>
            <Button label="Open Health Connect" variant="secondary" onPress={openHealthConnect} />
          </View>
        ) : null}

        {access ? (
          <View className="gap-3">
            <View>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                className="font-bold text-display text-ink"
              >
                {today.toLocaleString("en-PH")}
              </Text>
              <Text className="font-sans text-caption text-ink-muted">
                steps · Average {stepsAverage(week).toLocaleString("en-PH")} a day
              </Text>
            </View>
            <BarChart
              label={`Steps for the last 7 days. Today ${today}.`}
              values={week}
              labels={week.map((_, i) => format(subDays(now, 6 - i), "EEEEE"))}
              highlight={week.length - 1}
            />
          </View>
        ) : null}

        {access && steps.data && !steps.data.sleepWeight ? (
          <View className="gap-3">
            <Notice tone="neutral">
              I can read your sleep and weight from Samsung Health too. Your sleep stays on this phone. Your weight
              saves to your account, like a weight you type.
            </Notice>
            <Button
              label="Allow sleep and weight"
              variant="secondary"
              loading={allowMore.isPending}
              onPress={() => allowMore.mutate()}
            />
          </View>
        ) : null}

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            Last night
          </Text>
          {entry ? (
            <>
              <DataRow
                title="Sleep"
                detail={`${entry.bed} to ${entry.wake}`}
                value={sleepText(minutes)}
                status={SLEEP_STATUS[sleepStrand(minutes)]}
                onPress={editToday}
                chevron
                last
              />
              {entry.source === "health_connect" ? (
                <>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="heart-outline" size={14} color={colors.inkMuted} />
                    <Text className="font-semibold text-badge text-ink-muted">From Samsung Health</Text>
                  </View>
                  <Text className="font-sans text-caption text-ink-muted">
                    I read this night from Health Connect. Tap the sleep to fix the times. {where}
                  </Text>
                </>
              ) : entry.source === "screen" ? (
                <>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="phone-portrait-outline" size={14} color={colors.inkMuted} />
                    <Text className="font-semibold text-badge text-ink-muted">From your screen</Text>
                  </View>
                  <Text className="font-sans text-caption text-ink-muted">
                    I read when your screen was off. Tap the sleep to fix the times. {where}
                  </Text>
                </>
              ) : (
                <Text className="font-sans text-caption text-ink-muted">You set these times. {where}</Text>
              )}
            </>
          ) : (
            <>
              <Text className="font-sans text-body text-ink">
                I found no sleep last night. Your screen was on for most of the night, or off for under 3 hours.
              </Text>
              <Button label="Add sleep" variant="secondary" size="input" onPress={editToday} />
            </>
          )}
        </View>

        <SleepWeek
          log={sleep.data}
          loading={sleep.isPending}
          now={now}
          onEdit={(day, e) => setEditing({ day, entry: e })}
        />

        <HealthCheckSection state={advice.state} loading={advice.loading} />
      </ScrollView>
      <SleepSheet
        key={editing ? `${editing.day.toDateString()}-${editing.entry?.bed}-${editing.entry?.wake}` : "closed"}
        visible={editing !== null}
        day={editing?.day}
        entry={editing?.entry}
        onClose={() => setEditing(null)}
      />
    </SafeAreaView>
  );
}
