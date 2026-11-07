import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { tripDatesText, tripLength, useTrips } from "@/lib/travel";

export default function TravelScreen() {
  const colors = useColors();
  const trips = useTrips();
  const list = trips.data ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="home">
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          Travel
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-3 px-5 pb-32 pt-3">
        {trips.error ? <Notice tone="danger">Could not load your trips. {trips.error.message}</Notice> : null}
        {trips.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : list.length === 0 ? (
          <EmptyState
            drawing="calendar"
            title="No trips yet"
            body="Add a trip, then your places, stays, food and transport."
            action={{ label: "Add trip", onPress: () => router.push("/travel/new") }}
          />
        ) : (
          list.map((trip) => {
            const days = tripLength(trip);
            return (
              <Pressable
                key={trip.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/travel/[id]", params: { id: trip.id } })}
                className="min-h-touch gap-1 rounded-card border border-border bg-surface-card p-4 active:bg-surface-muted"
              >
                <Text className="font-semibold text-heading text-ink">{trip.title}</Text>
                <Text className="font-sans text-caption text-ink-muted">
                  {tripDatesText(trip)} · {days} {days === 1 ? "day" : "days"}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
      {list.length > 0 ? <Fab label="Add trip" onPress={() => router.push("/travel/new")} /> : null}
    </SafeAreaView>
  );
}
