import { format, parseISO } from "date-fns";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { useColors } from "@/lib/colors";
import {
  groupByDay,
  LEAGUES,
  matchStatus,
  matchTitle,
  openMatch,
  useSports,
  type LeagueId,
  type Standing,
} from "@/lib/sports";

type Mode = "matches" | "standings";

const VIEWS = [
  { value: "matches", label: "Matches" },
  { value: "standings", label: "Standings" },
] as const;

function StandingsTable({ rows, nba }: { rows: Standing[]; nba: boolean }) {
  const cell = "w-chip text-right font-sans text-label text-ink";
  const head = "w-chip text-right font-semibold text-badge text-ink-muted";
  return (
    <View>
      <View className="flex-row items-center gap-2 border-b-2 border-border py-2">
        <Text className="min-w-0 flex-1 font-semibold text-badge text-ink-muted">Team</Text>
        <Text className={head}>W</Text>
        {nba ? null : <Text className={head}>D</Text>}
        <Text className={head}>L</Text>
        {nba ? null : <Text className={head}>Pts</Text>}
      </View>
      {rows.map((row) => (
        <View key={row.team} className="flex-row items-center gap-2 border-b-2 border-border py-2">
          <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-label text-ink">
            {row.position}. {row.team}
          </Text>
          <Text className={cell}>{row.won}</Text>
          {nba ? null : <Text className={cell}>{row.drawn}</Text>}
          <Text className={cell}>{row.lost}</Text>
          {nba ? null : <Text className={cell}>{row.points}</Text>}
        </View>
      ))}
    </View>
  );
}

export default function SportsScreen() {
  const colors = useColors();
  const [league, setLeague] = useState<LeagueId>("PL");
  const [view, setView] = useState<Mode>("matches");
  const sports = useSports(league);
  const data = sports.data;
  const days = groupByDay(data?.matches ?? []);
  const sync = data?.sync;
  const failed = sync?.last_error_at && (!sync.last_ok_at || sync.last_error_at > sync.last_ok_at);
  const updated = sync?.last_ok_at ? format(parseISO(sync.last_ok_at), "MMM d, h:mm a") : null;
  const calculated = data?.standings.some((s) => s.is_calculated);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Sports" tone="daily" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {LEAGUES.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              variant="filter"
              selected={item.id === league}
              onPress={() => setLeague(item.id)}
            />
          ))}
        </ScrollView>
        <Segmented label="Show" options={VIEWS} value={view} onChange={setView} />

        {failed ? (
          <Notice tone="warning">Could not update.{updated ? ` Showing the last data, from ${updated}.` : ""}</Notice>
        ) : null}

        {sports.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : sports.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load sports. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => sports.refetch()} />
          </View>
        ) : view === "matches" ? (
          days.length === 0 ? (
            <EmptyState drawing="calendar" title="No matches in the next 14 days" body="I check twice a day." />
          ) : (
            days.map((day) => (
              <View key={day.title}>
                <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
                  {day.title}
                </Text>
                {day.matches.map((match, index) => (
                  <DataRow
                    key={match.external_id}
                    title={matchTitle(match)}
                    detail={
                      match.status === "final"
                        ? "Open match page"
                        : `${format(parseISO(match.starts_at), "h:mm a")} · Open live scores`
                    }
                    status={matchStatus(match)}
                    onPress={() => void openMatch(match)}
                    last={index === day.matches.length - 1}
                  />
                ))}
              </View>
            ))
          )
        ) : (data?.standings ?? []).length === 0 ? (
          <EmptyState drawing="list" title="No standings yet" body="I check twice a day." />
        ) : (
          <>
            <StandingsTable rows={data?.standings ?? []} nba={league === "NBA"} />
            {calculated ? (
              <Text className="font-sans text-caption text-ink-muted">
                I counted this order from results, so a tie can differ from the official table.
              </Text>
            ) : null}
          </>
        )}

        {updated ? <Text className="font-sans text-caption text-ink-muted">Updated {updated}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
