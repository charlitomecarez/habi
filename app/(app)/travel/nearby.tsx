import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { ModuleGate } from "@/components/ui/ModuleGate";
import { NewsImage } from "@/components/news/NewsImage";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { OptionSheet } from "@/components/ui/OptionSheet";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { currentCoords, knownCoords, openLocationSettings } from "@/lib/location";
import { toDateString } from "@/lib/money";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  distanceText,
  openInMaps,
  useNearbyPlaces,
  useSaveIdea,
  withDistance,
  type Coords,
  type PlaceCategory,
  type PlaceWithDistance,
} from "@/lib/places";
import { tripDatesText, useTrips } from "@/lib/travel";

type Saved = { tripId: string; title: string };

/** Sights, food, parks and shopping within 10 km. Your exact spot stays on the phone. */
function NearbyScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [asking, setAsking] = useState(false);
  const [refused, setRefused] = useState(false);
  const [category, setCategory] = useState<PlaceCategory>("sights");
  const [picked, setPicked] = useState<PlaceWithDistance | null>(null);
  const [choosingTrip, setChoosingTrip] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const places = useNearbyPlaces(coords, category);
  const trips = useTrips();
  const saveIdea = useSaveIdea();
  // With location already allowed, the list opens at once, as from Home.
  useEffect(() => {
    knownCoords()
      .then((found) => {
        if (found) setCoords((current) => current ?? found);
      })
      .catch(() => undefined);
  }, []);

  const list = coords && places.data ? withDistance(places.data, coords).slice(0, 20) : [];

  const [today] = useState(() => toDateString(new Date()));
  const tripOptions = [...(trips.data ?? [])]
    .sort((a, b) => Number(a.end_date < today) - Number(b.end_date < today) || a.start_date.localeCompare(b.start_date))
    .map((t) => ({ value: t.id, label: t.title, detail: tripDatesText(t) }));

  async function askLocation() {
    if (refused) {
      await openLocationSettings();
      setRefused(false);
      return;
    }
    setAsking(true);
    try {
      const found = await currentCoords();
      if (found) setCoords(found);
      else setRefused(true);
    } catch {
      setRefused(true);
    } finally {
      setAsking(false);
    }
  }

  function addTo(tripId: string) {
    if (!picked) return;
    const title = trips.data?.find((t) => t.id === tripId)?.title ?? "your trip";
    saveIdea.mutate(
      { tripId, place: picked, category },
      {
        onSuccess: () => {
          setSaved({ tripId, title });
          setChoosingTrip(false);
          setPicked(null);
        },
      },
    );
  }

  if (!coords) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader scrollY={scrollY} title="Places near you" tone="home" />
        <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-4 px-5 pb-8 pt-4">
          <EmptyState
            drawing="box"
            title="I can list sights, food and parks near you"
            body={
              refused
                ? "I could not get your location. Allow location for Habi in settings, then try again."
                : "I need your location while you use this screen. Your exact spot stays on the phone. I send only an area of about 5 km."
            }
          />
          <Button
            label={refused ? "Open settings" : "Use my location"}
            loading={asking}
            onPress={() => void askLocation()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader scrollY={scrollY} title="Places near you" subtitle="Within 10 km" tone="home" />
      <ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <View accessibilityRole="radiogroup" accessibilityLabel="Kind of place" className="flex-row flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={CATEGORY_LABELS[c]}
              variant="filter"
              selected={c === category}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
        {saved ? (
          <View className="flex-row items-center gap-3 rounded-input bg-surface-muted pl-4">
            <Text className="flex-1 font-sans text-caption text-ink" accessibilityLiveRegion="polite">
              Saved to Ideas in {saved.title}.
            </Text>
            <Button
              label="Open trip"
              variant="plain"
              size="input"
              onPress={() => router.push({ pathname: "/travel/[id]", params: { id: saved.tripId } })}
            />
          </View>
        ) : null}

        {places.isPending ? (
          <Skeleton />
        ) : places.error ? (
          <View className="gap-3">
            <ErrorNotice error={places.error} />
            <Button label="Try again" variant="secondary" size="input" onPress={() => void places.refetch()} />
          </View>
        ) : list.length === 0 ? (
          <EmptyState
            drawing="box"
            title={`I found no ${CATEGORY_LABELS[category].toLowerCase()} places within 10 km`}
            body="Try another kind of place."
          />
        ) : (
          <View>
            {list.map((p, i) => (
              <DataRow
                key={`${p.name}-${p.latitude}`}
                title={p.name}
                detail={p.kind}
                value={distanceText(p.km)}
                trailing={p.image ? <NewsImage uri={p.image} /> : null}
                onPress={() => setPicked(p)}
                last={i === list.length - 1}
              />
            ))}
          </View>
        )}
        <Text className="font-sans text-caption text-ink-muted">
          Places from OpenStreetMap contributors, through Geoapify.
        </Text>
      </ScrollView>

      <Sheet
        visible={picked !== null && !choosingTrip}
        onClose={() => setPicked(null)}
        title={picked?.name ?? ""}
        subtitle={picked ? `${picked.kind} · ${distanceText(picked.km)}` : undefined}
      >
        <View className="gap-3">
          <Button label="Open in Maps" variant="secondary" onPress={() => picked && void openInMaps(picked)} />
          <Button label="Add to trip" variant="secondary" onPress={() => setChoosingTrip(true)} />
        </View>
      </Sheet>

      {tripOptions.length > 0 ? (
        <OptionSheet
          visible={choosingTrip}
          onClose={() => setChoosingTrip(false)}
          title="Add to which trip?"
          subtitle={saveIdea.error ? "Could not save. Try again." : undefined}
          options={tripOptions}
          value={null}
          onChange={addTo}
        />
      ) : (
        <Sheet visible={choosingTrip} onClose={() => setChoosingTrip(false)} title="You have no trips yet">
          <Button label="New trip" onPress={() => router.push("/travel/new")} />
        </Sheet>
      )}
    </SafeAreaView>
  );
}

/** Needs GEOAPIFY_KEY on the server; see ModuleGate. */
export default function NearbyScreenGated() {
  return (
    <ModuleGate id="travel" tone="home" needs="places" title="Places near you">
      <NearbyScreen />
    </ModuleGate>
  );
}
