import { Ionicons } from "@expo/vector-icons";
import { format, subDays } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SleepSheet } from "@/components/steps/SleepSheet";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { openHealthConnect } from "@/lib/health-connect";
import { sleepMinutes, sleepStrand, sleepText, useSleepLog } from "@/lib/sleep";
import { stepsAverage, useAllowSteps, useSteps } from "@/lib/steps";

// The sleep strand: 7 hours or more is good, 6 to 7 is short, under 6 is too short.
const SLEEP_STATUS = {
  good: { label: "Good", tone: "good" },
  watch: { label: "Short", tone: "watch" },
  over: { label: "Too short", tone: "over" },
  empty: undefined,
} as const;

export default function StepsScreen() {
  const colors = useColors();
  const now = new Date();
  const steps = useSteps();
  const allow = useAllowSteps();
  const sleep = useSleepLog();
  const [logging, setLogging] = useState(false);
  const [asked, setAsked] = useState(false);

  const access = steps.data?.access ?? false;
  const week = steps.data?.week ?? [];
  const today = week[week.length - 1] ?? 0;
  const entry = sleep.data?.[format(now, "yyyy-MM-dd")];
  const minutes = entry ? sleepMinutes(entry) : 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Steps and sleep" subtitle="Today" tone="daily" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {steps.isPending ? <Skeleton layout="home" /> : null}

        {!steps.isPending && !access && !asked ? (
          <View className="gap-3">
            <Text className="font-bold text-title text-ink">See your steps on Home</Text>
            <Text className="font-sans text-body text-ink-muted">
              Habi reads your steps from Health Connect, and your sleep from when your screen is off. All of it stays on
              this phone.
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
                onPress={() => setLogging(true)}
                chevron
                last
              />
              {entry.source === "screen" ? (
                <>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="phone-portrait-outline" size={14} color={colors.inkMuted} />
                    <Text className="font-semibold text-badge text-ink-muted">From your screen</Text>
                  </View>
                  <Text className="font-sans text-caption text-ink-muted">
                    I read when your screen was off. Tap the sleep to fix the times. It stays on this phone.
                  </Text>
                </>
              ) : (
                <Text className="font-sans text-caption text-ink-muted">
                  You set these times. It stays on this phone.
                </Text>
              )}
            </>
          ) : (
            <>
              <Text className="font-sans text-body text-ink">
                I found no sleep last night. Your screen was on for most of the night, or off for under 3 hours.
              </Text>
              <Button label="Add sleep" variant="secondary" size="input" onPress={() => setLogging(true)} />
            </>
          )}
        </View>
      </ScrollView>
      <SleepSheet
        key={entry ? `${entry.bed}-${entry.wake}` : "new"}
        visible={logging}
        entry={entry}
        onClose={() => setLogging(false)}
      />
    </SafeAreaView>
  );
}
