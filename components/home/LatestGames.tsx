import { format, isToday, isYesterday, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { TeamMark } from "@/components/sports/TeamMark";
import { DataRow } from "@/components/ui/DataRow";
import { useFeatures } from "@/lib/features";
import { openRace, seriesLabel, useFollowedRaces, type HomeRaceItem } from "@/lib/motor";
import { useUserSettings } from "@/lib/settings";
import { HOME_GAMES, LEAGUES, matchStatus, matchTitle, openMatch, useFollowedGames, type Match } from "@/lib/sports";

const leagueName = (id: string) => LEAGUES.find((l) => l.id === id)?.label ?? id;

function when(m: Match): string {
  const at = parseISO(m.starts_at);
  if (m.status === "final") return isToday(at) ? "Today" : isYesterday(at) ? "Yesterday" : format(at, "EEE, MMM d");
  return isToday(at) ? format(at, "h:mm a") : format(at, "EEE, MMM d, h:mm a");
}

type Row = { kind: "match"; match: Match } | { kind: "race"; item: HomeRaceItem };
const rowTime = (r: Row) => Date.parse(r.kind === "match" ? r.match.starts_at : r.item.race.starts_at);

function raceRow(item: HomeRaceItem, last: boolean) {
  const { race, result } = item;
  const at = parseISO(race.starts_at);
  return (
    <DataRow
      key={`${race.series}:${race.season}:${race.round}`}
      title={result ? `${race.name}: ${race.winner} won` : race.name}
      detail={`${seriesLabel(race.series)} · ${result ? format(at, "EEE") : format(at, "EEE h:mm a")}`}
      status={result ? { label: "Result", tone: "muted" } : { label: isToday(at) ? "Today" : "Soon", tone: "muted" }}
      onPress={() => void openRace(race)}
      last={last}
    />
  );
}

/**
 * The last result and the next match of the teams you follow, and the next race or winner of the
 * F1 and MotoGP series you show on Home, after Shortcuts. At most 3 rows, soonest to now first. With
 * nothing followed, one row opens the Follow sheet in Sports. It loads after the attention rows (`ready`).
 */
export function LatestGames({ ready }: { ready: boolean }) {
  const settings = useUserSettings();
  const features = useFeatures();
  // Not set up on this server, or switched off in Settings › Modules: no Games block.
  const off = !features.sports || (settings.data?.hiddenModules ?? []).includes("sports");
  const follows = settings.data?.followedTeams ?? [];
  const series = settings.data?.followedSeries ?? [];
  const games = useFollowedGames(ready && !off ? follows : []);
  const races = useFollowedRaces(ready && !off ? series : []);
  // The time Home opened. Rows sort by their distance from it.
  const [now] = useState(Date.now);

  if (!ready || !settings.data || off) return null;
  const none = follows.length === 0 && series.length === 0;
  const loading = (follows.length > 0 && games.isPending) || (series.length > 0 && races.isPending);
  const rows: Row[] = [
    ...(games.data ?? []).map((match) => ({ kind: "match" as const, match })),
    ...(races.data ?? []).map((item) => ({ kind: "race" as const, item })),
  ]
    .sort((a, b) => Math.abs(rowTime(a) - now) - Math.abs(rowTime(b) - now))
    .slice(0, HOME_GAMES);
  if (!none && (loading || rows.length === 0)) return null;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
          Games
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/sports")}
          className="h-touch justify-center pl-3"
        >
          <Text className="font-semibold text-label text-accent">Sports</Text>
        </Pressable>
      </View>
      {none ? (
        <DataRow
          title="Follow a team"
          detail="I show its last result and next match here."
          onPress={() => router.push({ pathname: "/sports", params: { follow: "1" } })}
          chevron
          last
        />
      ) : (
        rows.map((row, index) => {
          const last = index === rows.length - 1;
          if (row.kind === "race") return raceRow(row.item, last);
          const m = row.match;
          return (
            <DataRow
              key={`${m.league}:${m.external_id}`}
              title={matchTitle(m)}
              leading={
                <View className="gap-1">
                  <TeamMark crest={m.home_crest} code={m.home_code} />
                  <TeamMark crest={m.away_crest} code={m.away_code} />
                </View>
              }
              detail={`${leagueName(m.league)} · ${when(m)}`}
              value={m.status === "final" && m.home_score !== null ? `${m.home_score}-${m.away_score}` : undefined}
              status={matchStatus(m)}
              onPress={() => void openMatch(m)}
              last={last}
            />
          );
        })
      )}
    </View>
  );
}
