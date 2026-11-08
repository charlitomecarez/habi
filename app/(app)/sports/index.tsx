import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TeamMark } from "@/components/sports/TeamMark";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
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
  const place = "w-6 font-sans text-label text-ink";
  const rate = (row: Standing) => {
    const games = row.won + row.lost;
    return games === 0 ? "—" : (row.won / games).toFixed(3).replace(/^0/, "");
  };
  return (
    <View>
      <View className="flex-row items-center gap-1 border-b-2 border-border py-2">
        <Text className="w-6 font-semibold text-badge text-ink-muted">#</Text>
        <View className="w-8" />
        <Text className="min-w-0 flex-1 font-semibold text-badge text-ink-muted">Team</Text>
        {nba ? null : <Text className={head}>P</Text>}
        <Text className={head}>W</Text>
        <Text className={head}>L</Text>
        <Text className={head}>{nba ? "Win %" : "Pts"}</Text>
      </View>
      {rows.map((row) => (
        <View key={row.team} className="flex-row items-center gap-1 border-b-2 border-border py-2">
          <Text className={place}>{row.position}</Text>
          <TeamMark crest={row.crest} code={row.code} />
          <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-label text-ink">
            {row.team}
          </Text>
          {nba ? null : <Text className={cell}>{row.played}</Text>}
          <Text className={cell}>{row.won}</Text>
          <Text className={cell}>{row.lost}</Text>
          <Text className={`${cell} font-semibold`}>{nba ? rate(row) : row.points}</Text>
        </View>
      ))}
    </View>
  );
}

export default function SportsScreen() {
  const [league, setLeague] = useState<LeagueId>("PL");
  const [view, setView] = useState<Mode>("matches");
  const sports = useSports(league);
  const data = sports.data;
  const grouped = groupByDay(data?.matches ?? []);
  // Today and the coming days first, then the latest results.
  const isPast = (day: (typeof grouped)[number]) =>
    isBefore(parseISO(day.matches[0].starts_at), startOfDay(new Date()));
  const days = [...grouped.filter((d) => !isPast(d)), ...grouped.filter(isPast).reverse()];
  const sync = data?.sync;
  const failed = sync?.last_error_at && (!sync.last_ok_at || sync.last_error_at > sync.last_ok_at);
  const lastOk = sync?.last_ok_at ? parseISO(sync.last_ok_at) : null;
  const updated = lastOk ? `${isToday(lastOk) ? "today" : format(lastOk, "MMM d")}, ${format(lastOk, "h:mm a")}` : null;
  const calculated = data?.standings.some((s) => s.is_calculated);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title="Sports" tone="daily" subtitle={updated ? `Updated ${updated}` : undefined} />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        <View accessibilityRole="radiogroup" accessibilityLabel="League" className="flex-row flex-wrap gap-2">
          {LEAGUES.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              variant="filter"
              selected={item.id === league}
              onPress={() => setLeague(item.id)}
            />
          ))}
        </View>
        <Segmented label="Show" options={VIEWS} value={view} onChange={setView} />

        {failed ? (
          <Notice tone="warning">Could not update.{updated ? ` Showing the last data, from ${updated}.` : ""}</Notice>
        ) : null}

        {sports.isPending ? (
          <Skeleton />
        ) : sports.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load sports. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => sports.refetch()} />
          </View>
        ) : view === "matches" ? (
          days.length === 0 ? (
            <EmptyState
              drawing="calendar"
              title={lastOk ? "No matches in the next 14 days" : "I have no sports data yet"}
              body={lastOk ? "I check twice a day." : "I check at 7 AM and 3 PM."}
            />
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
                    leading={
                      <View className="gap-1">
                        <TeamMark crest={match.home_crest} code={match.home_code} />
                        <TeamMark crest={match.away_crest} code={match.away_code} />
                      </View>
                    }
                    detail={match.status === "final" ? "Open match page" : format(parseISO(match.starts_at), "h:mm a")}
                    value={
                      match.status === "final" && match.home_score !== null
                        ? `${match.home_score}-${match.away_score}`
                        : undefined
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
          <EmptyState
            drawing="list"
            title={lastOk ? "No standings yet" : "I have no sports data yet"}
            body={lastOk ? "I check twice a day." : "I check at 7 AM and 3 PM."}
          />
        ) : (
          <>
            {calculated ? (
              <Notice tone="neutral">
                The app counts this order from results. A tie can differ from the official order.
              </Notice>
            ) : null}
            <StandingsTable rows={data?.standings ?? []} nba={league === "NBA"} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
