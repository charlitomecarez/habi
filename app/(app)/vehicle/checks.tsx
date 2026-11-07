import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import {
  DAILY_CHECKS,
  useToggleVehicleCheck,
  useVehicleChecks,
  WEEKLY_CHECKS,
  type Check,
  type CheckList as ListName,
} from "@/lib/vehicle-checks";

function CheckRow({ check, done, last, onPress }: { check: Check; done: boolean; last: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={check.label}
      accessibilityState={{ checked: done }}
      onPress={onPress}
      className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${last ? "" : "border-b-2 border-border"}`}
    >
      <Ionicons name={done ? "checkbox" : "square-outline"} size={24} color={done ? colors.accent : colors.inkMuted} />
      <Text className={`min-w-0 flex-1 font-semibold text-row-title ${done ? "text-ink-muted" : "text-ink"}`}>
        {check.label}
      </Text>
    </Pressable>
  );
}

function CheckSection({
  title,
  note,
  list,
  checks,
  ticks,
}: {
  title: string;
  note: string;
  list: ListName;
  checks: readonly Check[];
  ticks: readonly string[];
}) {
  const toggle = useToggleVehicleCheck();
  return (
    <View>
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        {title}
      </Text>
      <Text className="font-sans text-caption text-ink-muted">{note}</Text>
      {checks.map((check, index) => (
        <CheckRow
          key={check.id}
          check={check}
          done={ticks.includes(check.id)}
          last={index === checks.length - 1}
          onPress={() => toggle.mutate({ list, id: check.id })}
        />
      ))}
    </View>
  );
}

/** The quick checks that a rider does by hand. Ticks stay on this phone. */
export default function VehicleChecksScreen() {
  const ticks = useVehicleChecks();
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title="Checks"
        backLabel="Back to Vehicle"
        subtitle={`${ticks.daily.length} of ${DAILY_CHECKS.length} today · ${ticks.weekly.length} of ${WEEKLY_CHECKS.length} this week`}
      />
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-4">
        <CheckSection
          title="Before riding"
          note="Clears each day."
          list="daily"
          checks={DAILY_CHECKS}
          ticks={ticks.daily}
        />
        <CheckSection
          title="Weekly"
          note="Clears each Monday."
          list="weekly"
          checks={WEEKLY_CHECKS}
          ticks={ticks.weekly}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
