import { format, isToday, isYesterday, parseISO } from "date-fns";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { TeamMark } from "@/components/sports/TeamMark";
import { DataRow } from "@/components/ui/DataRow";
import { useFeatures } from "@/lib/features";
import { useUserSettings } from "@/lib/settings";
import { LEAGUES, matchStatus, matchTitle, openMatch, useFollowedGames, type Match } from "@/lib/sports";

const leagueName = (id: string) => LEAGUES.find((l) => l.id === id)?.label ?? id;

function when(m: Match): string {
  const at = parseISO(m.starts_at);
  if (m.status === "final") return isToday(at) ? "Today" : isYesterday(at) ? "Yesterday" : format(at, "EEE, MMM d");
  return isToday(at) ? format(at, "h:mm a") : format(at, "EEE, MMM d, h:mm a");
}

/**
 * The last result and the next match of the teams you follow, after Shortcuts. With no team followed,
 * one row opens the Follow sheet in Sports. It loads after the attention rows (`ready`).
 */
export function LatestGames({ ready }: { ready: boolean }) {
  const settings = useUserSettings();
  const features = useFeatures();
  // Not set up on this server, or switched off in Settings › Modules: no Games block.
  const off = !features.sports || (settings.data?.hiddenModules ?? []).includes("sports");
  const follows = settings.data?.followedTeams ?? [];
  const games = useFollowedGames(ready && !off ? follows : []);

  if (!ready || !settings.data || off) return null;
  if (follows.length > 0 && (games.isPending || games.error || (games.data ?? []).length === 0)) return null;

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
      {follows.length === 0 ? (
        <DataRow
          title="Follow a team"
          detail="I show its last result and next match here."
          onPress={() => router.push({ pathname: "/sports", params: { follow: "1" } })}
          chevron
          last
        />
      ) : (
        (games.data ?? []).map((m, index, list) => (
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
            last={index === list.length - 1}
          />
        ))
      )}
    </View>
  );
}
