import { format, isToday, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Notice } from "@/components/ui/Notice";
import { TabField } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { AddVehicleSheet } from "@/components/vehicle/AddVehicleSheet";
import { UpdateOdometerSheet } from "@/components/vehicle/UpdateOdometerSheet";
import { economy, useFuelLogs } from "@/lib/fuel";
import { formatPeso } from "@/lib/money";
import { DAILY_CHECKS, useVehicleChecks, WEEKLY_CHECKS } from "@/lib/vehicle-checks";
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

/** The fuel average covers this many fill-ups. */
const FUEL_AVERAGE_RUNS = 5;

function ServiceRow({ service }: { service: ServiceDue }) {
  const overdue = service.status === "overdue";
  const soon = service.status === "due_soon";
  const used = usedShare(service);
  const name = service.nextDueKm !== null ? `${service.item} · at ${formatKm(service.nextDueKm)} km` : service.item;
  const left =
    service.kmRemaining !== null && service.kmRemaining > 0
      ? `${formatKm(service.kmRemaining)} km left`
      : overdue || soon
        ? dueText(service)
        : laterText(service);
  const word = overdue ? "Overdue" : soon ? "Due soon" : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[service.item, left, word].filter(Boolean).join(", ")}
      onPress={() => router.push({ pathname: "/vehicle/log-service", params: { serviceId: service.vehicleServiceId } })}
      className="min-h-touch justify-center gap-1 py-2 active:bg-surface-muted"
    >
      <View className="flex-row flex-wrap justify-between gap-x-3">
        <Text className="min-w-0 shrink font-semibold text-label text-ink">{name}</Text>
        <Text className="font-sans text-label text-ink-muted">
          {left}
          {word ? (
            <Text className={`font-semibold ${overdue ? "text-over" : "text-watch"}`}>{` · ${word}`}</Text>
          ) : null}
        </Text>
      </View>
      {used !== null ? (
        <View className="h-bar bg-surface-muted">
          <View className="h-full bg-accent" style={{ width: `${used * 100}%` }} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function VehicleScreen() {
  const [sheet, setSheet] = useState<"odometer" | "add" | null>(null);
  const checks = useVehicleChecks();
  const vehicle = useVehicle();
  const vehicleId = vehicle.data?.id;
  const due = useServiceDue(vehicleId);
  const lastReading = useLastReading(vehicleId);
  const fuel = useFuelLogs(vehicleId);
  const fuelRuns = economy(fuel.data ?? []);
  const fuelLatest = fuelRuns.at(-1);
  const fuelRecent = fuelRuns.slice(-FUEL_AVERAGE_RUNS);
  const fuelAverage =
    fuelRecent.reduce((sum, run) => sum + run.km, 0) /
    Math.max(
      fuelRecent.reduce((sum, run) => sum + run.litres, 0),
      1,
    );
  const lastFill = [...(fuel.data ?? [])].sort((a, b) => b.odometer_km - a.odometer_km)[0];

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
        <View className="w-full flex-1 self-stretch px-5 pt-4">
          <Skeleton layout="detail" />
        </View>
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
        detail={`${vehicleName(v)} · Updated ${isToday(parseISO(updatedAt)) ? "today" : format(parseISO(updatedAt), "MMM d")}`}
      />
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        {error ? <Notice tone="danger">Could not load services. Check your connection.</Notice> : null}
        {noIntervals ? (
          <Notice tone="warning">
            No service has an interval yet. Add the intervals from the owner&apos;s manual to see what is due.
          </Notice>
        ) : null}

        {due.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <>
            <View>
              {[...dueNow, ...later].map((s) => (
                <ServiceRow key={s.vehicleServiceId} service={s} />
              ))}
            </View>

            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Checks
              </Text>
              <DataRow
                title="Before riding"
                detail={`${checks.daily.length} of ${DAILY_CHECKS.length} done today`}
                status={
                  checks.daily.length === DAILY_CHECKS.length
                    ? { label: "Done", tone: "good" }
                    : { label: "Today", tone: "muted" }
                }
                onPress={() => router.push("/vehicle/checks")}
              />
              <DataRow
                title="Weekly"
                detail={`${checks.weekly.length} of ${WEEKLY_CHECKS.length} done this week`}
                status={checks.weekly.length === WEEKLY_CHECKS.length ? { label: "Done", tone: "good" } : undefined}
                onPress={() => router.push("/vehicle/checks")}
                last
              />
            </View>

            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Fuel
              </Text>
              {fuelLatest && lastFill ? (
                <>
                  <DataRow
                    title="Average"
                    detail={`Last ${fuelRecent.length} ${fuelRecent.length === 1 ? "fill-up" : "fill-ups"}`}
                    value={`${fuelAverage.toFixed(1)} km/L`}
                    onPress={() => router.push("/vehicle/fuel")}
                  />
                  <DataRow
                    title="Last fill-up"
                    detail={`${format(parseISO(lastFill.filled_on), "MMM d")} · ${lastFill.litres} L`}
                    value={formatPeso(lastFill.total)}
                    onPress={() => router.push("/vehicle/fuel")}
                    last
                  />
                </>
              ) : (
                <DataRow
                  title="Fuel log"
                  detail="Log a full tank twice to see km/L"
                  onPress={() => router.push("/vehicle/fuel")}
                  last
                />
              )}
            </View>

            <View>
              <DataRow title="Mark services done" onPress={() => router.push("/vehicle/mark-done")} />
              <DataRow title="Log another service" onPress={() => router.push("/vehicle/log-service")} last />
            </View>
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
