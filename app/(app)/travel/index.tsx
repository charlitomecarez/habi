import { router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { Notice } from "@/components/ui/Notice";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFeatures } from "@/lib/features";
import { tripDatesText, tripLength, useTrips } from "@/lib/travel";

export default function TravelScreen() {
  const trips = useTrips();
  const list = trips.data ?? [];
  const places = useFeatures().places;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="home">
        <Text accessibilityRole="header" className="font-bold text-title text-on-shell">
          Travel
        </Text>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-3 px-5 pb-fab-clear pt-3">
        {places ? (
          <DataRow
            title="Places near you"
            detail="Sights, food and parks within 10 km"
            onPress={() => router.push("/travel/nearby")}
            chevron
            last
          />
        ) : null}
        {trips.error ? <Notice tone="danger">Could not load your trips. {trips.error.message}</Notice> : null}
        {trips.isPending ? (
          <Skeleton />
        ) : list.length === 0 ? (
          <EmptyState
            drawing="calendar"
            title="No trips yet"
            body="Add a trip, then your places, stays, food and transport."
            action={{ label: "Add trip", onPress: () => router.push("/travel/new") }}
          />
        ) : (
          <View>
            {list.map((trip, index) => {
              const days = tripLength(trip);
              return (
                <DataRow
                  key={trip.id}
                  title={trip.title}
                  detail={`${tripDatesText(trip)} · ${days} ${days === 1 ? "day" : "days"}`}
                  onPress={() => router.push({ pathname: "/travel/[id]", params: { id: trip.id } })}
                  last={index === list.length - 1}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
      {list.length > 0 ? <Fab label="Add trip" onPress={() => router.push("/travel/new")} /> : null}
    </SafeAreaView>
  );
}
