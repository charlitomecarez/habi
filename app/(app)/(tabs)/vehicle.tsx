import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { AddVehicleSheet } from "@/components/vehicle/AddVehicleSheet";
import { UpdateOdometerSheet } from "@/components/vehicle/UpdateOdometerSheet";
import { colors } from "@/lib/colors";
import {
  dueText,
  formatKm,
  laterText,
  useLastReading,
  useServiceDue,
  useVehicle,
  vehicleName,
  type ServiceDue,
} from "@/lib/vehicles";

function DueRow({ service }: { service: ServiceDue }) {
  const overdue = service.status === "overdue";
  return (
    <View className="flex-row items-center gap-3 rounded-card border border-border bg-surface-card px-4 py-3">
      <View className="flex-1 gap-1">
        <Text className="font-semibold text-row-title text-ink">{service.item}</Text>
        <Text className={`font-medium text-caption ${overdue ? "text-danger" : "text-warning"}`}>{dueText(service)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Log service: ${service.item}`}
        onPress={() => router.push({ pathname: "/vehicle/log-service", params: { serviceId: service.vehicleServiceId } })}
        className="h-chip justify-center rounded-md border border-border-input bg-surface-card px-4 active:bg-surface-muted"
      >
        <Text className="font-semibold text-label text-ink">Log service</Text>
      </Pressable>
    </View>
  );
}

export default function VehicleScreen() {
  const [sheet, setSheet] = useState<"odometer" | "add" | null>(null);
  const vehicle = useVehicle();
  const vehicleId = vehicle.data?.id;
  const due = useServiceDue(vehicleId);
  const lastReading = useLastReading(vehicleId);

  const services = due.data ?? [];
  const dueNow = services
    .filter((s) => s.status === "overdue" || s.status === "due_soon")
    .sort((a, b) => Number(b.status === "overdue") - Number(a.status === "overdue") || a.sortOrder - b.sortOrder);
  const later = services.filter((s) => s.status === "ok" || s.status === "no_interval");
  const noIntervals = services.length > 0 && services.every((s) => s.status === "no_interval");

  const error = vehicle.error ?? due.error;

  if (vehicle.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page">
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (!vehicle.data) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <View className="flex-1 gap-6 px-5 pt-6">
          <ScreenHeader title="Vehicle" />
          {error ? (
            <Notice tone="danger">Could not load your vehicle. {error.message}</Notice>
          ) : (
            <View className="items-center gap-4 rounded-hero border border-border bg-surface-card p-6">
              <Ionicons name="bicycle-outline" size={32} color={colors.accent} />
              <Text className="text-center font-sans text-body text-ink-muted">
                Add your motorcycle to see which services are due.
              </Text>
              <View className="self-stretch">
                <Button label="Add vehicle" onPress={() => setSheet("add")} />
              </View>
            </View>
          )}
        </View>
        <AddVehicleSheet visible={sheet === "add"} onClose={() => setSheet(null)} />
      </SafeAreaView>
    );
  }

  const v = vehicle.data;
  const updatedAt = lastReading.data?.logged_at ?? v.created_at;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-6">
        <View className="gap-1">
          <ScreenHeader title={vehicleName(v)} />
          <Text className="font-sans text-caption text-ink-muted">
            {v.make} {v.model}
          </Text>
        </View>

        <View className="gap-4 rounded-hero border border-border bg-surface-card p-5">
          <View className="gap-1">
            <Text className="font-sans text-caption text-ink-muted">Odometer</Text>
            <Text className="font-bold text-display text-ink">
              {formatKm(v.current_odometer_km)} <Text className="font-semibold text-title text-ink-muted">km</Text>
            </Text>
            <Text className="font-sans text-caption text-ink-muted">
              Last updated {format(parseISO(updatedAt), "MMM d")}
            </Text>
          </View>
          <Button label="Update odometer" size="input" onPress={() => setSheet("odometer")} />
        </View>

        {error ? <Notice tone="danger">Could not load services. {error.message}</Notice> : null}
        {noIntervals ? (
          <Notice tone="warning">
            No service has an interval yet. Add the intervals from the owner&apos;s manual to see what is due.
          </Notice>
        ) : null}

        {due.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <View className="gap-3">
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Service due now
              </Text>
              {dueNow.length === 0 ? (
                <View className="rounded-card border border-border bg-surface-card px-4 py-3">
                  <Text className="font-sans text-caption text-ink-muted">Nothing is due.</Text>
                </View>
              ) : (
                dueNow.map((s) => <DueRow key={s.vehicleServiceId} service={s} />)
              )}
            </View>

            {later.length > 0 ? (
              <View className="gap-3">
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  Later
                </Text>
                <View className="overflow-hidden rounded-card border border-border bg-surface-card">
                  {later.map((s, index) => (
                    <Pressable
                      key={s.vehicleServiceId}
                      accessibilityRole="button"
                      accessibilityLabel={`Log service: ${s.item}, ${laterText(s)}`}
                      onPress={() => router.push({ pathname: "/vehicle/log-service", params: { serviceId: s.vehicleServiceId } })}
                      className={`min-h-touch flex-row items-center justify-between gap-3 px-4 py-3 active:bg-surface-muted ${index < later.length - 1 ? "border-b border-divider" : ""}`}
                    >
                      <Text className="flex-1 font-medium text-row-title text-ink">{s.item}</Text>
                      <Text className="font-sans text-caption text-ink-muted">{laterText(s)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Button
              label="Mark services done"
              variant="secondary"
              size="input"
              onPress={() => router.push("/vehicle/mark-done")}
            />
            <Button
              label="Log another service"
              variant="secondary"
              size="input"
              onPress={() => router.push("/vehicle/log-service")}
            />
          </>
        )}
      </ScrollView>

      <UpdateOdometerSheet
        visible={sheet === "odometer"}
        onClose={() => setSheet(null)}
        vehicle={v}
        services={services}
        lastReading={lastReading.data ?? null}
      />
    </SafeAreaView>
  );
}
