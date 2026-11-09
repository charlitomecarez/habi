import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Input } from "@/components/ui/Input";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { goBack } from "@/lib/navigation";
import { useColors } from "@/lib/colors";
import { currentCoords } from "@/lib/location";
import { searchPlaces, useSavePlace, type Place } from "@/lib/weather";

export default function ChoosePlaceScreen() {
  const colors = useColors();
  const save = useSavePlace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [refused, setRefused] = useState(false);
  const [locating, setLocating] = useState(false);

  async function onChange(text: string) {
    setQuery(text);
    setFailed(false);
    if (text.trim().length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      setResults(await searchPlaces(text.trim()));
    } catch {
      setFailed(true);
    } finally {
      setSearching(false);
    }
  }

  async function pick(place: Place) {
    await save.mutateAsync(place);
    goBack();
  }

  async function locate() {
    setRefused(false);
    setLocating(true);
    try {
      const coords = await currentCoords();
      if (!coords) {
        setRefused(true);
        return;
      }
      await pick({ name: "My location", region: "Philippines", ...coords });
    } catch {
      setRefused(true);
    } finally {
      setLocating(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Choose a place" />
      <KeyboardScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <Input
          label="Search a place in the Philippines"
          value={query}
          onChangeText={(text) => void onChange(text)}
          autoCorrect={false}
          placeholder="Tagaytay"
        />
        {refused ? <Notice tone="warning">Location is off for Habi, so search for your town.</Notice> : null}
        {failed ? <Notice tone="danger">Could not search. Check your connection.</Notice> : null}
        {searching ? <ActivityIndicator color={colors.accent} /> : null}
        {results && results.length === 0 && !searching ? (
          <View className="gap-1">
            <Text className="font-bold text-title text-ink">No place found</Text>
            <Text className="font-sans text-body text-ink-muted">Check the spelling, or try a nearby town.</Text>
          </View>
        ) : null}
        <View>
          {(results ?? []).map((place, index, list) => (
            <DataRow
              key={`${place.name}-${place.latitude}`}
              title={place.name}
              detail={place.region}
              onPress={() => void pick(place)}
              last={index === list.length - 1}
            />
          ))}
        </View>
        <Button label="Use my location" loading={locating} onPress={() => void locate()} />
      </KeyboardScrollView>
    </SafeAreaView>
  );
}
