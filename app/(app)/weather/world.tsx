import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Input } from "@/components/ui/Input";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlaceSearch } from "@/components/weather/usePlaceSearch";
import { useColors } from "@/lib/colors";
import { addWorldPlace, MAX_WORLD, placeKey, readWorldPlaces, useSaveWorldPlaces, type Place } from "@/lib/weather";

const UNDO_MS = 8000;

type Removed = { place: Place; index: number };

/** Add and remove world places. Each change saves at once, so there is no save button. */
export default function WorldPlacesScreen() {
  const colors = useColors();
  const save = useSaveWorldPlaces();
  const search = usePlaceSearch({ world: true });
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void readWorldPlaces().then(setPlaces);
    return () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    };
  }, []);

  function commit(next: Place[]) {
    setPlaces(next);
    save.mutate(next);
  }

  function add(place: Place) {
    if (!places) return;
    commit(addWorldPlace(places, place));
    search.clear();
  }

  function remove(index: number) {
    if (!places) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setRemoved({ place: places[index], index });
    undoTimer.current = setTimeout(() => setRemoved(null), UNDO_MS);
    commit(places.filter((_, i) => i !== index));
  }

  function undo() {
    if (!places || !removed) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    const next = [...places];
    next.splice(Math.min(removed.index, next.length), 0, removed.place);
    setRemoved(null);
    commit(next.slice(0, MAX_WORLD));
  }

  const full = (places?.length ?? 0) >= MAX_WORLD;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="World places" subtitle={places ? `${places.length} of ${MAX_WORLD} places` : undefined} />
      <KeyboardScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {removed ? (
          <View className="flex-row items-center gap-3 rounded-input bg-surface-muted pl-4">
            <Text className="flex-1 font-sans text-caption text-ink" accessibilityLiveRegion="polite">
              Removed {removed.place.name}.
            </Text>
            <Button label="Undo" variant="plain" size="input" onPress={undo} />
          </View>
        ) : null}
        {save.error ? <Notice tone="danger">Could not save your places.</Notice> : null}
        <View className="gap-2">
          <Input
            label="Add a place"
            value={search.query}
            onChangeText={(text) => void search.onChange(text)}
            autoCorrect={false}
            placeholder="Search a place"
            editable={!full}
          />
          {full ? <Text className="font-sans text-caption text-ink-muted">Remove a place to add another.</Text> : null}
        </View>
        {search.failed ? <Notice tone="danger">Could not search. Check your connection.</Notice> : null}
        {search.searching ? <ActivityIndicator color={colors.accent} /> : null}
        {search.results && search.results.length === 0 && !search.searching ? (
          <View className="gap-1">
            <Text className="font-bold text-title text-ink">No place found</Text>
            <Text className="font-sans text-body text-ink-muted">Check the spelling, or try a nearby city.</Text>
          </View>
        ) : null}
        {search.results && search.results.length > 0 ? (
          <View>
            {search.results.map((place, index, list) => (
              <DataRow
                key={`${place.name}-${place.latitude}`}
                title={place.name}
                detail={place.region}
                onPress={() => add(place)}
                last={index === list.length - 1}
              />
            ))}
          </View>
        ) : null}
        <View>
          <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
            Your places
          </Text>
          {places === null ? (
            <Skeleton rows={5} />
          ) : places.length === 0 ? (
            <Text className="py-3 font-sans text-body text-ink-muted">No world places. Search a city to add it.</Text>
          ) : (
            places.map((place, index) => (
              <DataRow
                key={placeKey(place)}
                title={place.name}
                detail={place.region}
                last={index === places.length - 1}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${place.name}`}
                    onPress={() => remove(index)}
                    className="h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted"
                  >
                    <Ionicons name="close" size={20} color={colors.inkMuted} />
                  </Pressable>
                }
              />
            ))
          )}
        </View>
      </KeyboardScrollView>
    </SafeAreaView>
  );
}
