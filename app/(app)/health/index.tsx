import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DoseRow } from "@/components/health/DoseRow";
import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { DashedButton } from "@/components/ui/DashedButton";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { LineChart } from "@/components/ui/LineChart";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { isActive, timeText, todaysDoses, useDeleteWeight, useHealth, useLogWeight } from "@/lib/health";

const kg = (v: number) => `${v.toFixed(1)} kg`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function HealthScreen() {
  const colors = useColors();
  const health = useHealth();
  const logWeight = useLogWeight();
  const deleteWeight = useDeleteWeight();
  const [weighing, setWeighing] = useState(false);
  const [weight, setWeight] = useState("");
  const [weighedOn, setWeighedOn] = useState<Date | null>(new Date());
  const [weightError, setWeightError] = useState<string | null>(null);

  const data = health.data;
  const doses = data ? todaysDoses(data.doses) : [];
  const active = (data?.medicines ?? []).filter((m) => isActive(m));
  const ended = (data?.medicines ?? []).filter((m) => !isActive(m));
  const weights = data?.weights ?? [];
  const latest = weights[weights.length - 1];

  async function saveWeight() {
    const value = Number(weight.replace(",", "."));
    if (!(value >= 20 && value <= 400)) return setWeightError("Enter your weight in kg, for example 72.4.");
    await logWeight.mutateAsync({ kg: value, on: weighedOn ?? new Date() });
    setWeighing(false);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="daily">
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          Health
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-6 px-5 pb-10 pt-2">
        {health.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : health.error || !data ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your health records. {health.error?.message}</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => health.refetch()} />
          </View>
        ) : (
          <>
            <Section title="Doses today">
              <View className="overflow-hidden">
                {doses.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No doses today.</Text>
                ) : (
                  doses.map((d, i) => <DoseRow key={d.id} dose={d} last={i === doses.length - 1} />)
                )}
              </View>
            </Section>

            <Section title="Medicines">
              <View className="overflow-hidden">
                {active.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No medicines right now.</Text>
                ) : (
                  active.map((m, i) => (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.name}, ${m.times.map(timeText).join(", ")}. Edit`}
                      onPress={() => router.push({ pathname: "/health/medicine/[id]", params: { id: m.id } })}
                      className={`min-h-touch gap-1 px-4 py-3 active:bg-surface-muted ${i === active.length - 1 ? "" : "border-b-2 border-border"}`}
                    >
                      <Text className="font-semibold text-row-title text-ink">{m.name}</Text>
                      <Text className="font-sans text-caption text-ink-muted">
                        {[
                          m.dose,
                          m.times.map(timeText).join(", "),
                          m.end_on ? `until ${format(parseISO(m.end_on), "MMM d")}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
              {ended.length ? (
                <Text className="font-sans text-caption text-ink-muted">
                  Ended: {ended.map((m) => m.name).join(", ")}
                </Text>
              ) : null}
              <DashedButton label="Add medicine" icon="add" onPress={() => router.push("/health/medicine/new")} />
            </Section>

            <Section title={latest ? `Weight · ${kg(latest.weight_kg)}` : "Weight"}>
              <View className="rounded-card border border-border bg-surface-card p-3">
                <LineChart
                  points={weights.map((w) => ({ date: w.on_date, value: w.weight_kg }))}
                  format={kg}
                  label="Weight"
                />
              </View>
              {weights.length ? (
                <View className="overflow-hidden">
                  {[...weights]
                    .reverse()
                    .slice(0, 5)
                    .map((w, i, list) => (
                      <View
                        key={w.id}
                        className={`min-h-touch flex-row items-center gap-3 py-1 pl-4 pr-1 ${i === list.length - 1 ? "" : "border-b-2 border-border"}`}
                      >
                        <Text className="min-w-0 flex-1 font-sans text-body text-ink">
                          {format(parseISO(w.on_date), "EEE, MMM d")}
                        </Text>
                        <Text className="font-semibold text-row-title text-ink">{kg(w.weight_kg)}</Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${kg(w.weight_kg)} on ${format(parseISO(w.on_date), "MMM d")}`}
                          onPress={() => deleteWeight.mutate(w.id)}
                          className="h-touch w-touch items-center justify-center"
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </Pressable>
                      </View>
                    ))}
                </View>
              ) : null}
              <DashedButton
                label="Log weight"
                icon="scale-outline"
                onPress={() => {
                  setWeight(latest ? String(latest.weight_kg) : "");
                  setWeighedOn(new Date());
                  setWeightError(null);
                  setWeighing(true);
                }}
              />
            </Section>

            <Section title="Doctor visits">
              <View className="overflow-hidden">
                {data.visits.length === 0 ? (
                  <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No visits logged.</Text>
                ) : (
                  data.visits.map((v, i) => (
                    <Pressable
                      key={v.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${format(parseISO(v.visited_on), "MMMM d, yyyy")}, ${v.doctor || v.reason}. Open`}
                      onPress={() => router.push({ pathname: "/health/visit/[id]", params: { id: v.id } })}
                      className={`min-h-touch gap-1 px-4 py-3 active:bg-surface-muted ${i === data.visits.length - 1 ? "" : "border-b-2 border-border"}`}
                    >
                      <Text className="font-semibold text-row-title text-ink">{v.doctor || v.reason}</Text>
                      <Text className="font-sans text-caption text-ink-muted">
                        {[
                          format(parseISO(v.visited_on), "MMM d, yyyy"),
                          v.doctor ? v.reason : null,
                          v.photo_paths.length ? `${v.photo_paths.length} photos` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
              <DashedButton label="Add visit" icon="add" onPress={() => router.push("/health/visit/new")} />
            </Section>
          </>
        )}
      </ScrollView>

      <Sheet visible={weighing} onClose={() => setWeighing(false)} title="Log weight">
        <AmountInput
          label="Weight"
          unit="kg"
          value={weight}
          onChangeText={setWeight}
          inputMode="decimal"
          keyboardType="decimal-pad"
          error={weightError ?? undefined}
        />
        <DateTimeField label="Date" mode="date" value={weighedOn} onChange={setWeighedOn} />
        {logWeight.error ? <Notice tone="danger">{logWeight.error.message}</Notice> : null}
        <Button label="Save weight" loading={logWeight.isPending} onPress={saveWeight} />
      </Sheet>
    </SafeAreaView>
  );
}
