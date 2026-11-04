import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountInput } from "@/components/ui/AmountInput";
import { Button } from "@/components/ui/Button";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { KeyboardAvoidingView } from "@/components/ui/KeyboardAvoidingView";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { useColors } from "@/lib/colors";
import { useLogFuel } from "@/lib/fuel";
import { formatPeso, useAccounts, useCategories } from "@/lib/money";
import { formatKm, parseKm, useVehicle, vehicleName } from "@/lib/vehicles";

const TANK = [
  { value: "full", label: "Full tank" },
  { value: "partial", label: "Not full" },
] as const;

export default function LogFuelScreen() {
  const colors = useColors();
  const vehicle = useVehicle();
  const accounts = useAccounts();
  const categories = useCategories();
  const log = useLogFuel();
  const v = vehicle.data;
  const [filledOn, setFilledOn] = useState<Date | null>(new Date());
  const [litres, setLitres] = useState("");
  const [price, setPrice] = useState("");
  const [odometer, setOdometer] = useState("");
  const [tank, setTank] = useState<"full" | "partial">("full");
  const [station, setStation] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accountValue = accountId ?? accounts.data?.[0]?.id ?? null;
  const l = Number(litres.replace(",", "."));
  const p = Number(price.replace(",", "."));
  const total = l > 0 && p > 0 ? Math.round(l * p * 100) / 100 : null;
  // Fuel goes in Motorcycle when you have it, else Transport.
  const category =
    categories.data?.find((c) => c.kind === "expense" && c.name === "Motorcycle") ??
    categories.data?.find((c) => c.kind === "expense" && c.name === "Transport");

  async function onSave() {
    if (!v) return setError("Add your vehicle first.");
    const km = parseKm(odometer);
    if (!(l > 0 && l < 1000)) return setError("Enter the litres, such as 4.2.");
    if (!(p > 0 && p < 1000)) return setError("Enter the price per litre, such as 62.50.");
    if (km === null) return setError("Enter the odometer reading in km.");
    if (km < v.current_odometer_km) return setError(`The odometer is lower than the last reading, ${formatKm(v.current_odometer_km)} km.`);
    if (!accountValue) return setError("Choose the account you paid from.");
    await log.mutateAsync({
      vehicleId: v.id,
      filledOn: filledOn ?? new Date(),
      litres: l,
      pricePerLitre: p,
      odometerKm: km,
      fullTank: tank === "full",
      station: station.trim(),
      accountId: accountValue,
      categoryId: category?.id ?? null,
    });
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-page">
      <KeyboardAvoidingView className="flex-1">
        <View className="flex-row items-center gap-1 px-3 pb-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
          <Text accessibilityRole="header" className="font-bold text-title text-ink">
            Log fill-up
          </Text>
        </View>
        <ScrollView contentContainerClassName="gap-5 px-5 pb-6 pt-2" keyboardShouldPersistTaps="handled">
          {v ? <Text className="font-sans text-caption text-ink-muted">{vehicleName(v)} · last reading {formatKm(v.current_odometer_km)} km</Text> : null}
          <DateTimeField label="Date" mode="date" value={filledOn} onChange={setFilledOn} />
          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1">
              <AmountInput label="Litres" unit="L" value={litres} onChangeText={setLitres} inputMode="decimal" keyboardType="decimal-pad" />
            </View>
            <View className="min-w-0 flex-1">
              <AmountInput label="Price per litre" unit="₱" unitPosition="start" value={price} onChangeText={setPrice} inputMode="decimal" keyboardType="decimal-pad" />
            </View>
          </View>
          <Text className="font-semibold text-label text-ink">Total: {total === null ? "—" : formatPeso(total)}</Text>
          <AmountInput label="Odometer" unit="km" value={odometer} onChangeText={setOdometer} inputMode="numeric" keyboardType="number-pad" />
          <Segmented label="Tank" options={TANK} value={tank} onChange={setTank} />
          <Text className="font-sans text-caption text-ink-muted">km per litre counts from one full tank to the next.</Text>
          <Input label="Station" optional value={station} onChangeText={setStation} placeholder="Petron" />
          <Select
            label="Paid from"
            options={(accounts.data ?? []).map((a) => ({ value: a.id, label: a.name }))}
            value={accountValue}
            onChange={setAccountId}
          />
        </ScrollView>
        <View className="gap-3 border-t border-border px-5 pb-6 pt-3">
          {error || log.error ? <Notice tone="danger">{error ?? log.error?.message}</Notice> : null}
          <Button label="Save fill-up" loading={log.isPending} onPress={onSave} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
