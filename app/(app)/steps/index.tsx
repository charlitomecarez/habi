import { format, subDays } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SleepSheet } from "@/components/steps/SleepSheet";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { openHealthConnect } from "@/lib/health-connect";
import { sleepMinutes, sleepText, useSleepLog } from "@/lib/sleep";
import { stepsAverage, useAllowSteps, useSteps } from "@/lib/steps";

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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Steps and sleep" subtitle="Today" tone="daily" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {steps.isPending ? <ActivityIndicator color={colors.accent} className="py-8" /> : null}

        {!steps.isPending && !access && !asked ? (
          <View className="gap-3">
            <Text className="font-bold text-title text-ink">See your steps on Home</Text>
            <Text className="font-sans text-body text-ink-muted">
              my-app reads your steps from Health Connect. You type your sleep. All of it stays on this phone.
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
              <Text className="font-bold text-display text-ink">{today.toLocaleString("en-PH")}</Text>
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
            <DataRow
              title="Sleep"
              detail={`${entry.bed} to ${entry.wake}`}
              value={sleepText(sleepMinutes(entry))}
              onPress={() => setLogging(true)}
              last
            />
          ) : (
            <>
              <Notice tone="warning">No sleep logged for last night.</Notice>
              <Button label="Log last night's sleep" onPress={() => setLogging(true)} />
            </>
          )}
          <Text className="font-sans text-caption text-ink-muted">You typed this sleep. It stays on this phone.</Text>
        </View>
      </ScrollView>
      <SleepSheet visible={logging} onClose={() => setLogging(false)} />
    </SafeAreaView>
  );
}
