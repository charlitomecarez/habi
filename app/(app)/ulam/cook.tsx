import { format } from "date-fns";
import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UlamHeader } from "@/components/ulam/UlamHeader";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { useUserSettings } from "@/lib/settings";
import { todayChoice, useSaveUlamDay, useUlamDays } from "@/lib/ulam";

export default function HowToCookScreen() {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const days = useUlamDays();
  const settings = useUserSettings();
  const save = useSaveUlamDay();

  const row = days.data?.find((d) => d.on_date === today);
  const { options, ulam, backup } = todayChoice(row, now, settings.data?.ulamLimit);
  const eaten = row?.eaten ?? false;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <UlamHeader title="How to cook" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-3">
        <Text className="font-sans text-label text-ink-muted">
          {ulam.name} · {ulam.cookMinutes} min
        </Text>
        <View className="overflow-hidden rounded-card border border-border bg-surface-card">
          {ulam.steps.map((step, index) => (
            <View
              key={step}
              className={`flex-row gap-3 px-4 py-3 ${index === ulam.steps.length - 1 ? "" : "border-b border-divider"}`}
            >
              <Text className="font-bold text-label text-ink">{index + 1}</Text>
              <Text className="flex-1 font-sans text-body text-ink">{step}</Text>
            </View>
          ))}
        </View>
        {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}
        {eaten ? null : (
          <Button
            label="I ate this"
            loading={save.isPending}
            onPress={async () => {
              await save.mutateAsync({
                date: today,
                ...(backup ? { options, source: "backup" as const } : {}),
                eaten: true,
              });
              router.back();
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
