import { format, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Notice } from "@/components/ui/Notice";
import { TabField } from "@/components/ui/ModuleHeader";
import { AddVehicleSheet } from "@/components/vehicle/AddVehicleSheet";
import { UpdateOdometerSheet } from "@/components/vehicle/UpdateOdometerSheet";
import { useColors } from "@/lib/colors";
import { economy, monthFuelCost, useFuelLogs } from "@/lib/fuel";
import { formatPeso } from "@/lib/money";
import {
  dueText,
  formatKm,
  laterText,
  useLastReading,
  usedShare,
  useServiceDue,
  useVehicle,
  vehicleName,
  type ServiceDue,
} from "@/lib/vehicles";

function ServiceRow({ service, last }: { service: ServiceDue; last: boolean }) {
  const overdue = service.status === "overdue";
  const soon = service.status === "due_soon";
  const used = usedShare(service);
  const open = () => router.push({ pathname: "/vehicle/log-service", params: { serviceId: service.vehicleServiceId } });
  return (
    <View className={last ? "" : "border-b-2 border-border"}>
      <DataRow
        title={service.item}
        detail={service.nextDueKm !== null ? `At ${formatKm(service.nextDueKm)} km` : undefined}
        status={
          overdue
            ? { label: dueText(service), tone: "over" }
            : soon
              ? { label: dueText(service), tone: "watch" }
              : { label: laterText(service), tone: "muted" }
        }
        onPress={open}
        last
      />
      {used !== null ? (
        <View className="mb-3 h-1 overflow-hidden bg-surface-muted">
          <View
            className={`h-full ${overdue ? "bg-over-fill" : soon ? "bg-watch-fill" : "bg-accent"}`}
            style={{ width: `${used * 100}%` }}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function VehicleScreen() {
  const colors = useColors();
  const [sheet, setSheet] = useState<"odometer" | "add" | null>(null);
  const vehicle = useVehicle();
  const vehicleId = vehicle.data?.id;
  const due = useServiceDue(vehicleId);
  const lastReading = useLastReading(vehicleId);
  const fuel = useFuelLogs(vehicleId);
  const fuelLatest = economy(fuel.data ?? []).at(-1);
  const fuelMonth = monthFuelCost(fuel.data ?? []);

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
        <TabField lead="Vehicle" />
        <View className="flex-1 gap-4 px-5 pt-4">
          {error ? (
            <Notice tone="danger">Could not load your vehicle. Check your connection.</Notice>
          ) : (
            <>
              <Text className="font-bold text-title text-ink">Add your motorcycle</Text>
              <Text className="font-sans text-body text-ink-muted">I tell you which services are due.</Text>
              <Button label="Add vehicle" onPress={() => setSheet("add")} />
            </>
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
      <TabField
        lead={`${formatKm(v.current_odometer_km)} km`}
        detail={`${vehicleName(v)} · ${v.make} ${v.model} · Updated ${format(parseISO(updatedAt), "MMM d")}`}
      />
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        {error ? <Notice tone="danger">Could not load services. Check your connection.</Notice> : null}
        {noIntervals ? (
          <Notice tone="warning">
            No service has an interval yet. Add the intervals from the owner&apos;s manual to see what is due.
          </Notice>
        ) : null}

        {due.isPending ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <View>
              {dueNow.length === 0 ? (
                <Text className="py-3 font-sans text-body text-ink-muted">Nothing is due.</Text>
              ) : (
                dueNow.map((s, index) => (
                  <ServiceRow
                    key={s.vehicleServiceId}
                    service={s}
                    last={later.length === 0 && index === dueNow.length - 1}
                  />
                ))
              )}
              {later.map((s, index) => (
                <ServiceRow key={s.vehicleServiceId} service={s} last={index === later.length - 1} />
              ))}
            </View>

            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Fuel
              </Text>
              <DataRow
                title="Fuel log"
                detail={`${formatPeso(fuelMonth)} this month`}
                value={fuelLatest ? `${fuelLatest.kmPerLitre.toFixed(1)} km/L` : undefined}
                onPress={() => router.push("/vehicle/fuel")}
                last
              />
            </View>

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

      <View className="border-t-2 border-border px-5 py-3">
        <Button label="Update odometer" onPress={() => setSheet("odometer")} />
      </View>

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
