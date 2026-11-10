import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import {
  adviceState,
  hasRecentNumbers,
  useHealthDayRows,
  useHealthInsights,
  useTurnOffHealthCheck,
  useTurnOnHealthCheck,
  type AdviceState,
  type HealthInsight,
} from "@/lib/health-check";
import { useUserSettings } from "@/lib/settings";

/** The advice as a numbered list with 2 px rules. Not a card: you read it, you do not act on it. */
export function AdviceList({ title, insight, time }: { title: string; insight: HealthInsight; time?: string }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
          {title}
        </Text>
        {time ? <Text className="font-sans text-caption text-ink-muted">{time}</Text> : null}
      </View>
      <View>
        {insight.tips.map((tip, i) => (
          <View
            key={i}
            accessible
            accessibilityLabel={`Tip ${i + 1}, ${tip}`}
            className={`flex-row gap-3 py-3 ${i === insight.tips.length - 1 ? "" : "border-b-2 border-border"}`}
          >
            <View className="h-8 w-8 items-center justify-center rounded-pill bg-surface-muted">
              <Text className="font-semibold text-caption text-ink">{i + 1}</Text>
            </View>
            <Text className="min-w-0 flex-1 font-sans text-body text-ink">{tip}</Text>
          </View>
        ))}
      </View>
      <Text className="font-sans text-caption text-ink-muted">
        From your numbers of the last 7 days. This is not medical advice.
      </Text>
    </View>
  );
}

/** Today's advice and whether the check is on, for the screen and for Home. */
export function useAdvice(now: Date): { state: AdviceState; loading: boolean } {
  const settings = useUserSettings();
  const on = settings.data?.healthCheck ?? false;
  const insights = useHealthInsights(on);
  const rows = useHealthDayRows();
  return {
    state: adviceState(on, insights.data ?? [], hasRecentNumbers(rows, now), now),
    loading: settings.isPending || (on && insights.isPending),
  };
}

function TipsLoading() {
  return (
    <Skeleton>
      <View className="gap-3">
        <Skeleton.Line width="40%" />
        <Skeleton.Line width="95%" />
        <Skeleton.Line width="85%" />
        <Skeleton.Line width="70%" />
      </View>
    </Skeleton>
  );
}

/**
 * The end of Steps and sleep: earlier advice or why there is none, and the switch. Today's advice
 * after 6 PM is drawn at the top of the screen instead.
 */
export function HealthCheckSection({ state, loading }: { state: AdviceState; loading: boolean }) {
  const colors = useColors();
  const turnOn = useTurnOnHealthCheck();
  const turnOff = useTurnOffHealthCheck();
  const [sheet, setSheet] = useState<"on" | "off" | null>(null);
  const on = state.kind !== "off";
  const busy = turnOn.isPending || turnOff.isPending;

  return (
    <View className="gap-3">
      {loading && on ? <TipsLoading /> : null}
      {!loading && state.kind === "yesterday" ? (
        <AdviceList title="Yesterday's advice" insight={state.insight} />
      ) : null}
      {!loading && state.kind === "first" ? (
        <Text className="font-sans text-body text-ink">
          I make your first advice at 6 PM today, from the numbers I have so far.
        </Text>
      ) : null}
      {!loading && state.kind === "none" ? (
        <Notice tone="warning">
          {state.reason === "failed"
            ? "I could not make today's advice, because the AI service did not answer. I try again tomorrow at 5:45 PM."
            : "I have no sleep or steps from the last 3 days, so I made no advice. Open the app in the morning, and I send them."}
        </Notice>
      ) : null}

      <View className="gap-1">
        <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
          6 PM health check
        </Text>
        <View className="min-h-touch flex-row items-center gap-3 border-b-2 border-border py-2">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="font-semibold text-row-title text-ink">Health check at 6 PM</Text>
            <Text className="font-sans text-caption text-ink-muted">
              {on ? (state.kind === "today" ? "On · Next at 6:00 PM tomorrow" : "On · Next at 6:00 PM today") : "Off"}
            </Text>
          </View>
          <Switch
            accessibilityLabel="Health check at 6 PM"
            value={on}
            disabled={busy}
            onValueChange={(next) => setSheet(next ? "on" : "off")}
            trackColor={{ true: colors.accent }}
          />
        </View>
        {!on ? (
          <Text className="pt-2 font-sans text-caption text-ink-muted">
            I can send 2 or 3 tips each evening, from your sleep, steps and weight. To make them, your numbers go to
            your account and to Groq, an AI service outside Habi, with no name.
          </Text>
        ) : null}
        {turnOn.error || turnOff.error ? (
          <Notice tone="danger">
            {turnOn.error ? "Could not turn on the health check." : "Could not turn off the health check."}
          </Notice>
        ) : null}
      </View>

      <Sheet visible={sheet === "on"} onClose={() => setSheet(null)} title="Turn on the health check?">
        <Text className="font-sans text-body text-ink">
          Each day, I send your sleep times and steps of the last 7 days to your Habi account. At 5:45 PM, Groq, an AI
          service outside Habi, reads those numbers and your weight to write the tips. Groq gets no name.
        </Text>
        <Text className="font-sans text-body text-ink">
          You can turn it off at any time. I then delete those numbers from your account.
        </Text>
        <Button
          label="Turn on health check"
          loading={turnOn.isPending}
          onPress={() => turnOn.mutate(undefined, { onSuccess: () => setSheet(null) })}
        />
        <Button label="Not now" variant="plain" onPress={() => setSheet(null)} />
      </Sheet>

      <ConfirmSheet
        visible={sheet === "off"}
        title="Turn off and delete your health numbers?"
        body="I delete the sleep times, steps and advice in your account, and stop sending them. Your weight log and the sleep on this phone stay."
        confirmLabel="Turn off and delete"
        loading={turnOff.isPending}
        onConfirm={() => turnOff.mutate(undefined, { onSuccess: () => setSheet(null) })}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
