import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ComponentProps } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ExportSheet } from "@/components/travel/ExportSheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { formatPeso, useExchangeRates } from "@/lib/money";
import {
  costText,
  groupByDay,
  kindLabel,
  timeText,
  tripDatesText,
  tripLength,
  tripTotals,
  useDeleteTrip,
  useTrip,
  useTripItems,
  type TripItem,
  type TripItemKind,
} from "@/lib/travel";

const IDEAS = "ideas";

const ICONS: Record<TripItemKind, ComponentProps<typeof Ionicons>["name"]> = {
  go: "location-outline",
  stay: "bed-outline",
  eat: "restaurant-outline",
  transport: "bus-outline",
  other: "ellipse-outline",
};

function ItemRow({ item }: { item: TripItem }) {
  const colors = useColors();
  const detail = [kindLabel(item.kind), timeText(item.start_time), item.cost === null ? null : costText(item)];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/travel/item/[id]", params: { id: item.id, tripId: item.trip_id } })}
      className="min-h-touch flex-row items-center gap-3 border-b-2 border-border py-3 active:bg-surface-muted"
    >
      <View className="h-touch w-touch items-center justify-center rounded-md bg-home-tint">
        <Ionicons name={ICONS[item.kind]} size={20} color={colors.home} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
          {item.title}
        </Text>
        <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
          {detail.filter(Boolean).join(" · ")}
        </Text>
      </View>
      {item.transaction_id ? <Text className="font-medium text-caption text-ink-muted">Paid</Text> : null}
    </Pressable>
  );
}

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const trip = useTrip(id);
  const items = useTripItems(id);
  const rates = useExchangeRates();
  const remove = useDeleteTrip();
  const [selected, setSelected] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const header = (title: string) => (
    <ModuleBar tone="home">
      <Text accessibilityRole="header" numberOfLines={1} className="flex-1 font-bold text-title text-on-shell">
        {title}
      </Text>
      {trip.data ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit trip"
          onPress={() => router.push({ pathname: "/travel/edit/[id]", params: { id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.onShell} />
        </Pressable>
      ) : null}
    </ModuleBar>
  );

  if (!trip.data) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        {header("Trip")}
        {trip.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : (
          <View className="px-5">
            <Notice tone="danger">{trip.error ? trip.error.message : "This trip was deleted."}</Notice>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const data = trip.data;
  const all = items.data ?? [];
  const { days, ideas } = groupByDay(all, data);
  const current = selected ?? days[0]?.day ?? IDEAS;
  const shown = current === IDEAS ? ideas : (days.find((d) => d.day === current)?.items ?? []);
  const totals = tripTotals(all, rates.data ?? []);
  const budget = data.budget_php;
  const length = tripLength(data);
  const share = budget ? Math.min(totals.planned / budget, 1) : 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      {header(data.title)}
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-1">
        <Text className="font-sans text-label text-ink-muted">
          {[data.destination, tripDatesText(data), `${length} ${length === 1 ? "day" : "days"}`]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {items.error ? <Notice tone="danger">{items.error.message}</Notice> : null}

        <View className="gap-2">
          <View className="flex-row justify-between gap-3">
            <Text className="font-semibold text-heading text-ink">
              {budget
                ? `${formatPeso(totals.planned)} of ${formatPeso(budget)}`
                : `${formatPeso(totals.planned)} planned`}
            </Text>
            <Text className="font-sans text-caption text-ink-muted">
              {budget && totals.planned > budget ? "Over budget" : "Budget"}
            </Text>
          </View>
          {budget ? (
            <View className="h-bar overflow-hidden rounded-pill bg-surface-muted">
              <View
                className={`h-bar rounded-pill ${totals.planned > budget ? "bg-danger" : "bg-accent"}`}
                style={{ width: `${share * 100}%` }}
              />
            </View>
          ) : null}
          {totals.missingRates.length > 0 ? (
            <Text className="font-sans text-caption text-ink-muted">
              Leaves out {totals.missingRates.join(", ")}, because no rate is set.
            </Text>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {days.map((d) => (
            <Chip
              key={d.day}
              label={format(parseISO(d.day), "MMM d")}
              selected={current === d.day}
              onPress={() => setSelected(d.day)}
            />
          ))}
          <Chip label={`Ideas (${ideas.length})`} selected={current === IDEAS} onPress={() => setSelected(IDEAS)} />
        </ScrollView>

        <View className="gap-2">
          {shown.length === 0 ? (
            <Text className="py-3 text-center font-sans text-label text-ink-muted">
              {current === IDEAS ? "No ideas yet." : "Nothing planned for this day."}
            </Text>
          ) : (
            shown.map((item) => <ItemRow key={item.id} item={item} />)
          )}
        </View>

        <Button label="Export PDF" variant="secondary" size="input" onPress={() => setExporting(true)} />
        <Button
          label="Add to plan"
          onPress={() =>
            router.push({
              pathname: "/travel/item/new",
              params: current === IDEAS ? { tripId: id } : { tripId: id, day: current },
            })
          }
        />
        {remove.error ? <Notice tone="danger">{remove.error.message}</Notice> : null}
        <Button
          label="Delete trip"
          variant="destructive"
          size="input"
          loading={remove.isPending}
          onPress={async () => {
            await remove.mutateAsync(id);
            router.back();
          }}
        />
      </ScrollView>
      <ExportSheet visible={exporting} onClose={() => setExporting(false)} trip={data} items={all} />
    </SafeAreaView>
  );
}
