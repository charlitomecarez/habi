import { Ionicons } from "@expo/vector-icons";
import { format, parse, parseISO } from "date-fns";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import { useWeather } from "@/lib/weather";

const hourText = (time: string) => format(parse(time, "HH:mm", new Date()), "h a");

export default function WeatherScreen() {
  const colors = useColors();
  const weather = useWeather();
  const { place, forecast, stale } = weather.data ?? { place: null, forecast: null, stale: false };
  const choose = () => router.push("/weather/place");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title="Weather"
        subtitle={place ? `${place.name}, ${place.region}` : undefined}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a place"
            onPress={choose}
            className="h-touch w-touch items-center justify-center"
          >
            <Ionicons name="search" size={22} color={colors.onShell} />
          </Pressable>
        }
      />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {weather.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : !place ? (
          <EmptyState
            drawing="calendar"
            title="Pick a place for your weather"
            body="Search a town. Your location is optional."
            action={{ label: "Choose a place", onPress: choose }}
          />
        ) : weather.error || !forecast ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load the forecast. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => weather.refetch()} />
          </View>
        ) : (
          <>
            {stale ? (
              <Notice tone="warning">
                Showing the last forecast, from {format(forecast.fetchedAt, "h:mm a")}. Could not update.
              </Notice>
            ) : null}
            <View className="gap-1">
              <Text className="font-bold text-display text-ink">{forecast.temperature}°</Text>
              <Text className="font-semibold text-row-title text-ink">{forecast.word}</Text>
              <Text className="font-sans text-caption text-ink-muted">
                Rain {forecast.rain}% · High {forecast.high}° · Low {forecast.low}°
              </Text>
            </View>
            {forecast.hours.length > 0 ? (
              <View className="flex-row justify-between gap-2">
                {forecast.hours.map((hour) => (
                  <View key={hour.time} className="flex-1 items-center gap-1">
                    <Text className="font-sans text-caption text-ink-muted">{hourText(hour.time)}</Text>
                    <Text className="font-bold text-amount text-ink">{hour.temperature}°</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View>
              <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                Next 3 days
              </Text>
              {forecast.days.map((day, index) => (
                <DataRow
                  key={day.date}
                  title={format(parseISO(day.date), "EEE")}
                  detail={`Rain ${day.rain}%`}
                  value={`${day.high}° / ${day.low}°`}
                  last={index === forecast.days.length - 1}
                />
              ))}
            </View>
            <Text className="font-sans text-caption text-ink-muted">
              Weather data by Open-Meteo. Updated {format(forecast.fetchedAt, "h:mm a")}.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
