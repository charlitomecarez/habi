import { Ionicons } from "@expo/vector-icons";
import { addDays, format, isToday, subDays } from "date-fns";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { useColors } from "@/lib/colors";
import { isScreenTimeSupported, openUsageSettings, useScreenTime, useUsageAccess } from "@/lib/screen-time";

/** "2 h 15 min", "45 min", "under a minute" */
export function duration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

const TOP_APPS = 3;

/** "40 min under average", against the 7-day average. */
function compareText(todayMs: number, averageMs: number): string {
  const gap = duration(Math.abs(todayMs - averageMs));
  return todayMs <= averageMs ? `${gap} under average` : `${gap} over average`;
}

/** Today's screen time and top apps, on Android only. The data never leaves the phone. */
export function ScreenTimeCard() {
  const colors = useColors();
  const access = useUsageAccess();
  const [day, setDay] = useState(() => new Date());
  const usage = useScreenTime(day, access);

  if (!isScreenTimeSupported) return null;

  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        Screen time
      </Text>
      <View className="gap-3">
        {!access ? (
          <>
            <Text className="font-sans text-body text-ink">
              Turn on Usage access for my-app to see your screen time here. It stays on this phone.
            </Text>
            <Button label="Turn on usage access" variant="secondary" size="input" onPress={openUsageSettings} />
          </>
        ) : (
          <>
            <View className="flex-row items-center gap-1">
              <View className="min-w-0 flex-1">
                {isToday(day) ? null : (
                  <Text className="font-medium text-caption text-ink-muted">{format(day, "EEEE, MMM d")}</Text>
                )}
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  className="font-bold text-display text-ink"
                >
                  {usage.data ? duration(usage.data.day.totalMs) : "…"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous day"
                onPress={() => setDay(subDays(day, 1))}
                className="h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted"
              >
                <Ionicons name="chevron-back" size={20} color={colors.ink} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next day"
                accessibilityState={{ disabled: isToday(day) }}
                disabled={isToday(day)}
                onPress={() => setDay(addDays(day, 1))}
                className={`h-touch w-touch items-center justify-center rounded-pill active:bg-surface-muted ${isToday(day) ? "opacity-0" : ""}`}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.ink} />
              </Pressable>
            </View>
            {usage.isPending ? (
              <ActivityIndicator color={colors.accent} />
            ) : usage.error ? (
              <Text className="font-sans text-caption text-danger">
                Could not read screen time. {usage.error.message}
              </Text>
            ) : usage.data ? (
              <>
                <Text
                  className={`font-semibold text-caption ${usage.data.day.totalMs <= usage.data.weekMs / 7 ? "text-good" : "text-over"}`}
                >
                  {compareText(usage.data.day.totalMs, usage.data.weekMs / 7)}
                </Text>
                <BarChart
                  label={`Screen time for the last 7 days. Average ${duration(usage.data.weekMs / 7)} a day.`}
                  values={usage.data.dailyMs}
                  labels={Array.from({ length: 7 }, (_, i) => format(subDays(day, 6 - i), "EEEEE"))}
                  highlight={6}
                />
                <Text className="font-sans text-caption text-ink-muted">
                  Average {duration(usage.data.weekMs / 7)} a day
                </Text>
                {usage.data.day.apps.slice(0, TOP_APPS).map((a) => (
                  <View key={a.packageName} className="gap-1">
                    <View className="flex-row justify-between gap-3">
                      <Text className="min-w-0 shrink font-sans text-label text-ink">{a.label}</Text>
                      <Text className="font-sans text-label text-ink-muted">{duration(a.totalMs)}</Text>
                    </View>
                    <View className="h-bar bg-surface-muted">
                      <View
                        className="h-full bg-accent"
                        style={{ width: `${Math.min(100, (a.totalMs / Math.max(usage.data.day.totalMs, 1)) * 100)}%` }}
                      />
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
