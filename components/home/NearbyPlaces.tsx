import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { NewsImage } from "@/components/news/NewsImage";
import { DataRow } from "@/components/ui/DataRow";
import { useModuleFilter } from "@/lib/features";
import { knownCoords } from "@/lib/location";
import { distanceText, useNearbyPlaces, withDistance, type Coords } from "@/lib/places";

/**
 * The 3 nearest sights and a row to Places near you. Home never asks for location: without it, only
 * the row shows. It hides when Travel is off or the server has no places key.
 */
export function NearbyPlaces({ ready }: { ready: boolean }) {
  const filter = useModuleFilter();
  const off = !filter.features.places || filter.hidden.includes("travel");
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    if (!ready || off) return;
    knownCoords()
      .then(setCoords)
      .catch(() => undefined);
  }, [ready, off]);

  const places = useNearbyPlaces(off ? null : coords, "sights");
  if (!ready || off) return null;
  const list = coords && places.data ? withDistance(places.data, coords).slice(0, 3) : [];
  const open = () => router.push("/travel/nearby");

  return (
    <View>
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Places near you
      </Text>
      {list.map((p) => (
        <DataRow
          key={`${p.name}-${p.latitude}`}
          title={p.name}
          detail={p.kind}
          value={distanceText(p.km)}
          trailing={p.image ? <NewsImage uri={p.image} /> : null}
          onPress={open}
        />
      ))}
      <DataRow
        title={list.length > 0 ? "All places near you" : "Find places near you"}
        detail={list.length > 0 ? undefined : "Sights, food, parks and shopping within 10 km"}
        onPress={open}
        chevron
        last
      />
    </View>
  );
}
