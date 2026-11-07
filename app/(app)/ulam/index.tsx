import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MealSheet } from "@/components/ulam/MealSheet";
import { UlamHeader } from "@/components/ulam/UlamHeader";
import { UlamPhoto } from "@/components/ulam/UlamPhoto";
import { UlamSettingsSheet } from "@/components/ulam/UlamSettingsSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { formatPeso } from "@/lib/money";
import { useUserSettings } from "@/lib/settings";
import { RICE_KCAL, todayChoice, useSaveUlamDay, useUlamDays } from "@/lib/ulam";

export default function UlamScreen() {
  const colors = useColors();
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const days = useUlamDays();
  const settings = useUserSettings();
  const save = useSaveUlamDay();
  const [typing, setTyping] = useState(false);
  const [editing, setEditing] = useState(false);

  const row = days.data?.find((d) => d.on_date === today);
  const limit = settings.data?.ulamLimit ?? 99;
  const { options, picked, ulam, backup } = todayChoice(row, now, limit);
  const eaten = row?.eaten ?? false;

  // The first change on a backup day stores that day's backup, so every device then matches.
  const stored = backup ? { options, source: "backup" as const } : {};

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <UlamHeader
        title="Ulam"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ulam settings"
            onPress={() => setEditing(true)}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="options-outline" size={22} color={colors.onShell} />
          </Pressable>
        }
      />

      {days.isPending ? (
        <ActivityIndicator color={colors.accent} className="py-8" />
      ) : (
        <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-3">
          <Text className="font-sans text-label text-ink-muted">{format(now, "EEEE, MMMM d")}</Text>
          {days.error ? <Notice tone="danger">Could not load your ulam. {days.error.message}</Notice> : null}
          {save.error ? <Notice tone="danger">{save.error.message}</Notice> : null}

          {row?.custom ? (
            <View className="gap-1 rounded-card border border-border bg-surface-card p-4">
              <Text className="font-semibold text-row-title text-ink">You ate {row.custom.name}</Text>
              <Text className="font-sans text-caption text-ink-muted">Saved for today.</Text>
            </View>
          ) : null}

          <UlamPhoto ulam={ulam} />

          <View className="gap-2">
            <Text className="font-bold text-title text-ink">{ulam.name}</Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              className="font-bold text-display text-ink"
            >
              {formatPeso(ulam.cost)}
            </Text>
            <Text className="font-sans text-caption text-ink-muted">
              {ulam.cookMinutes} min to cook · ≈ {ulam.kcal} kcal, for one
            </Text>
          </View>

          {options.length > 1 ? (
            <View className="flex-row gap-2">
              {options.map((option, index) => (
                <Chip
                  key={option.name}
                  label={String(index + 1)}
                  selected={index === picked}
                  onPress={() => save.mutate({ date: today, ...stored, picked: index })}
                />
              ))}
            </View>
          ) : null}

          <View className="gap-3">
            <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
              What to buy
            </Text>
            <View className="overflow-hidden">
              {ulam.ingredients.map((item, index) => (
                <View
                  key={`${item.name}-${index}`}
                  className={`flex-row justify-between gap-3 px-4 py-3 ${index === ulam.ingredients.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <Text className="flex-1 font-sans text-label text-ink">{item.name}</Text>
                  <Text className="font-medium text-label text-ink">{formatPeso(item.price)}</Text>
                </View>
              ))}
            </View>
            <Text className="font-sans text-caption text-ink-muted">
              ≈ {ulam.kcal + RICE_KCAL} kcal with 1 cup rice
            </Text>
          </View>

          <View className="gap-3">
            <Button
              label={eaten ? "Undo I ate this" : "I ate this"}
              variant={eaten ? "secondary" : "primary"}
              loading={save.isPending}
              onPress={() => save.mutate({ date: today, ...stored, eaten: !eaten })}
            />
            {picked < options.length - 1 ? (
              <Button
                label="Show another"
                variant="secondary"
                size="input"
                onPress={() => save.mutate({ date: today, ...stored, picked: picked + 1 })}
              />
            ) : options.length > 1 ? (
              <Text className="font-sans text-caption text-ink-muted">You saw all {options.length} for today.</Text>
            ) : null}
            <Button label="How to cook" variant="secondary" size="input" onPress={() => router.push("/ulam/cook")} />
            <Button label="I ate something else" variant="secondary" size="input" onPress={() => setTyping(true)} />
            <Button label="Last 7 days" variant="secondary" size="input" onPress={() => router.push("/ulam/week")} />
          </View>
        </ScrollView>
      )}

      <MealSheet date={typing ? today : null} onClose={() => setTyping(false)} />
      <UlamSettingsSheet
        visible={editing}
        onClose={() => setEditing(false)}
        limit={limit}
        avoid={settings.data?.ulamAvoid ?? []}
      />
    </SafeAreaView>
  );
}
