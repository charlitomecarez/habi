import { format } from "date-fns";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeatherGlyph } from "@/components/weather/WeatherGlyph";
import { localTime, useWorldWeather } from "@/lib/weather";

const ROW_ICON = 28;
const MINUTE = 60 * 1000;

/** The clock moves each minute, so each place's local time stays true while the screen is open. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Weather and local time in the places you pick, after Next 3 days. */
export function WorldSection() {
  const world = useWorldWeather();
  const now = useMinute();
  const edit = () => router.push("/weather/world");
  const forecast = world.data?.forecast ?? null;

  return (
    <View className="gap-1">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        World
      </Text>
      {world.isPending ? (
        <Skeleton rows={5} />
      ) : world.data?.places.length === 0 ? (
        <View className="gap-3 py-2">
          <Text className="font-sans text-body text-ink-muted">
            No world places. Add a place to see its weather and local time here.
          </Text>
          <Button label="Add places" variant="secondary" size="input" onPress={edit} />
        </View>
      ) : world.error || !forecast ? (
        <View className="gap-3 py-2">
          <Notice tone="danger">Could not load the world forecast. Check your connection.</Notice>
          <Button label="Try again" variant="secondary" size="input" onPress={() => world.refetch()} />
        </View>
      ) : (
        <>
          {world.data?.stale ? (
            <Notice tone="warning">
              Showing the last world forecast, from {format(forecast.fetchedAt, "h:mm a")}. Could not update.
            </Notice>
          ) : null}
          <View>
            {forecast.items.map((item, index) => {
              const local = localTime(now, item.utcOffsetSeconds);
              return (
                <DataRow
                  key={`${item.place.name}-${item.place.latitude}`}
                  title={item.place.name}
                  leading={<WeatherGlyph code={item.code} isDay={item.isDay} size={ROW_ICON} />}
                  detail={`${local.day ? `${local.day} ` : ""}${local.time} · ${item.word}`}
                  value={`${item.temperature}°`}
                  status={{ label: `${item.high}° / ${item.low}°`, tone: "muted" }}
                  last={index === forecast.items.length - 1}
                />
              );
            })}
          </View>
          <Button label="Edit places" variant="plain" size="input" onPress={edit} />
        </>
      )}
    </View>
  );
}
