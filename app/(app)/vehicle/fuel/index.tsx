import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { economy, monthFuelCost, useDeleteFuel, useFuelLogs } from "@/lib/fuel";
import { formatPeso } from "@/lib/money";
import { formatKm, useVehicle } from "@/lib/vehicles";

export default function FuelScreen() {
  const colors = useColors();
  const vehicle = useVehicle();
  const logs = useFuelLogs(vehicle.data?.id);
  const remove = useDeleteFuel();
  const list = logs.data ?? [];
  const econ = economy(list);
  const latest = econ[econ.length - 1];
  const avg = econ.length ? econ.reduce((s, e) => s + e.km, 0) / econ.reduce((s, e) => s + e.litres, 0) : null;
  const kmPerLById = new Map(econ.map((e) => [e.to.id, e.kmPerLitre]));

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar>
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          Fuel
        </Text>
      </ModuleBar>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-32 pt-2">
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1 rounded-card border border-border bg-surface-card px-4 py-3">
            <Text className="font-sans text-caption text-ink-muted">Last</Text>
            <Text className="font-bold text-title text-ink">
              {latest ? `${latest.kmPerLitre.toFixed(1)} km/L` : "—"}
            </Text>
          </View>
          <View className="flex-1 gap-1 rounded-card border border-border bg-surface-card px-4 py-3">
            <Text className="font-sans text-caption text-ink-muted">Average</Text>
            <Text className="font-bold text-title text-ink">{avg ? `${avg.toFixed(1)} km/L` : "—"}</Text>
          </View>
        </View>
        <Text className="font-sans text-caption text-ink-muted">
          Fuel this month: {formatPeso(monthFuelCost(list))}. km per litre needs two full-tank fill-ups.
        </Text>
        {remove.error ? <Notice tone="danger">{remove.error.message}</Notice> : null}
        {logs.isPending && vehicle.data ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : (
          <View className="overflow-hidden">
            {list.length === 0 ? (
              <Text className="px-4 py-3 font-sans text-caption text-ink-muted">No fill-ups logged.</Text>
            ) : (
              list.map((f, i) => (
                <View
                  key={f.id}
                  className={`min-h-touch flex-row items-center gap-3 py-2 pl-4 pr-1 ${i === list.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-semibold text-row-title text-ink">
                      {format(parseISO(f.filled_on), "MMM d")} · {formatPeso(f.total)}
                    </Text>
                    <Text className="font-sans text-caption text-ink-muted">
                      {[
                        `${f.litres} L at ₱${f.price_per_litre}`,
                        `${formatKm(f.odometer_km)} km`,
                        f.full_tank ? "Full" : "Not full",
                        kmPerLById.has(f.id) ? `${kmPerLById.get(f.id)!.toFixed(1)} km/L` : null,
                        f.station,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete fill-up on ${format(parseISO(f.filled_on), "MMM d")} and its expense`}
                    onPress={() => remove.mutate(f.id)}
                    className="h-touch w-touch items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
      <Fab label="Log fill-up" onPress={() => router.push("/vehicle/fuel/new")} />
    </SafeAreaView>
  );
}
