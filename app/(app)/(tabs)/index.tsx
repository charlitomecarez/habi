import { Ionicons } from "@expo/vector-icons";
import { format, isToday } from "date-fns";
import { router, type Href } from "expo-router";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DoseRow } from "@/components/health/DoseRow";
import { ScreenTimeCard } from "@/components/home/ScreenTimeCard";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/Notice";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useColors } from "@/lib/colors";
import { todaysDoses, useHealth } from "@/lib/health";
import { useItems } from "@/lib/inventory";
import { formatPeso, useAccounts } from "@/lib/money";
import { groupTodos, isOverdue, useTodos, type Todo } from "@/lib/todos";
import { useVaultStore } from "@/lib/vault";
import { dueText, formatKm, useServiceDue, useVehicle, vehicleName, type ServiceDue } from "@/lib/vehicles";
import { useAuth } from "@/providers/auth-provider";

type IconName = ComponentProps<typeof Ionicons>["name"];

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type AttentionCardProps = {
  icon: IconName;
  tone: "danger" | "warning";
  title: string;
  detail: string;
  status: string;
  onPress: () => void;
};

/** One thing that needs action today. The badge always says the status in words. */
function AttentionCard({ icon, tone, title, detail, status, onPress }: AttentionCardProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${detail}, ${status}`}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-card border border-border bg-surface-card p-4 active:bg-surface-muted"
    >
      <View
        className={`h-touch w-touch items-center justify-center rounded-md ${tone === "danger" ? "bg-danger-tint" : "bg-warning-tint"}`}
      >
        <Ionicons name={icon} size={22} color={tone === "danger" ? colors.danger : colors.warning} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {title}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {detail}
        </Text>
      </View>
      <Badge label={status} tone={tone} />
    </Pressable>
  );
}

type TileProps = {
  icon: IconName;
  label: string;
  value: string;
  href: Href;
};

function Tile({ icon, label, value, href }: TileProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}`}
      onPress={() => router.push(href)}
      className="min-h-touch min-w-0 grow basis-[45%] gap-3 rounded-card border border-border bg-surface-card p-4 active:bg-surface-muted"
    >
      <Ionicons name={icon} size={24} color={colors.accent} />
      <View className="gap-1">
        <Text className="font-semibold text-row-title text-ink">{label}</Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

function serviceCard(s: ServiceDue, vehicle: string, model: string): AttentionCardProps {
  const overdue = s.status === "overdue";
  return {
    icon: "warning-outline",
    tone: overdue ? "danger" : "warning",
    title: `${s.item} ${overdue ? "overdue" : "due soon"}`,
    detail: `${vehicle} · ${model} · ${dueText(s)}`,
    status: overdue ? "Overdue" : "Due soon",
    onPress: () => router.push({ pathname: "/vehicle/log-service", params: { serviceId: s.vehicleServiceId } }),
  };
}

function todoCard(todo: Todo): AttentionCardProps {
  const overdue = isOverdue(todo);
  const remind = todo.remind_at ? new Date(todo.remind_at) : null;
  const due = todo.due_at ? new Date(todo.due_at) : null;
  const detail = remind
    ? `reminder at ${format(remind, "h:mm a")}${isToday(remind) ? " today" : `, ${format(remind, "MMM d")}`}`
    : due
      ? `due ${isToday(due) ? "today" : format(due, "MMM d")}`
      : "no date";
  return {
    icon: "time-outline",
    tone: overdue ? "danger" : "warning",
    title: todo.title,
    detail: `Todo · ${detail}`,
    status: overdue ? "Overdue" : "Today",
    onPress: () => router.push({ pathname: "/todo/[id]", params: { id: todo.id } }),
  };
}

export default function HomeScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const now = new Date();
  const fullName = session?.user.user_metadata.full_name as string | undefined;
  const firstName = fullName?.split(" ")[0];
  const initial = (firstName ?? session?.user.email ?? "?").charAt(0).toUpperCase();

  const todos = useTodos();
  const vehicle = useVehicle();
  const due = useServiceDue(vehicle.data?.id);
  const accounts = useAccounts();
  const items = useItems();
  const vaultUnlocked = useVaultStore((s) => s.key !== null);
  const health = useHealth();
  const doses = health.data ? todaysDoses(health.data.doses, now) : [];

  const todayTodos = groupTodos(todos.data ?? [], now).today.filter((t) => !t.completed_at);
  const services = (due.data ?? [])
    .filter((s) => s.status === "overdue" || s.status === "due_soon")
    .sort((a, b) => Number(b.status === "overdue") - Number(a.status === "overdue") || a.sortOrder - b.sortOrder);
  const cards = [
    ...(vehicle.data ? services.map((s) => serviceCard(s, vehicleName(vehicle.data!), vehicle.data!.model)) : []),
    ...todayTodos.map(todoCard),
  ];

  const loading = todos.isPending || vehicle.isPending;
  const error = todos.error ?? vehicle.error ?? due.error;

  const total = (accounts.data ?? []).filter((a) => a.currency === "PHP").reduce((sum, a) => sum + a.balance, 0);
  const itemCount = items.data?.length;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-6">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-sans text-label text-ink-muted">{format(now, "EEEE, MMMM d")}</Text>
            <ScreenHeader title={firstName ? `${greeting(now)}, ${firstName}` : greeting(now)} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Account"
            onPress={() => router.push("/more")}
            className="h-touch w-touch items-center justify-center rounded-pill bg-border"
          >
            <Text className="font-semibold text-body text-ink">{initial}</Text>
          </Pressable>
        </View>

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            Needs attention
          </Text>
          {error ? <Notice tone="danger">Could not load everything. {error.message}</Notice> : null}
          {loading ? (
            <ActivityIndicator color={colors.accent} className="py-4" />
          ) : cards.length === 0 ? (
            <View className="rounded-card border border-border bg-surface-card px-4 py-3">
              <Text className="font-sans text-caption text-ink-muted">Nothing is due today.</Text>
            </View>
          ) : (
            cards.map((card) => <AttentionCard key={`${card.title}-${card.detail}`} {...card} />)
          )}
        </View>

        {doses.length > 0 ? (
          <View className="gap-3">
            <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
              Medicines today
            </Text>
            <View className="overflow-hidden rounded-card border border-border bg-surface-card">
              {doses.map((d, i) => (
                <DoseRow key={d.id} dose={d} last={i === doses.length - 1} />
              ))}
            </View>
          </View>
        ) : null}

        <ScreenTimeCard />

        <View className="gap-3">
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            Modules
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <Tile
              icon="card-outline"
              label="Money"
              value={accounts.data ? `${formatPeso(total)} total` : "Balances"}
              href="/money"
            />
            <Tile
              icon="bicycle-outline"
              label="Vehicle"
              value={vehicle.data ? `${formatKm(vehicle.data.current_odometer_km)} km` : "Add your vehicle"}
              href="/vehicle"
            />
            <Tile
              icon="cube-outline"
              label="Inventory"
              value={itemCount === undefined ? "Your things" : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
              href="/inventory"
            />
            <Tile
              icon="lock-closed-outline"
              label="Vault"
              value={vaultUnlocked ? "Unlocked" : "Locked"}
              href="/vault"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
