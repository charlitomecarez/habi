import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { TeamMark } from "@/components/sports/TeamMark";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { useSaveUserSettings } from "@/lib/settings";
import { followKey, LEAGUES, MAX_FOLLOWED, toggleFollow, useLeagueTeams, type LeagueId } from "@/lib/sports";

type FollowSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** The follows saved today. The parent keys the sheet by them, so the ticks start from them. */
  followed: readonly string[];
  startLeague: LeagueId;
};

/**
 * Pick the teams whose games show on Home. League chips switch the list inside the sheet, so you can
 * pick teams in several leagues in one go. At 12, the empty boxes turn off.
 */
export function FollowSheet({ visible, onClose, followed, startLeague }: FollowSheetProps) {
  const colors = useColors();
  const save = useSaveUserSettings();
  const [league, setLeague] = useState<LeagueId>(startLeague);
  const [picked, setPicked] = useState<string[]>(() => [...followed]);
  const teams = useLeagueTeams(league);
  const full = picked.length >= MAX_FOLLOWED;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Teams you follow"
      subtitle={`${picked.length} of 12 followed`}
      footer={
        <>
          {save.error ? <Notice tone="danger">Could not save your teams.</Notice> : null}
          <Button
            label="Save teams"
            loading={save.isPending}
            disabled={teams.isPending}
            onPress={() => save.mutate({ followedTeams: picked }, { onSuccess: onClose })}
          />
        </>
      }
    >
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
      <View>
        {teams.isPending ? (
          <Skeleton rows={5} />
        ) : teams.error ? (
          <Notice tone="danger">Could not load the teams. Check your connection.</Notice>
        ) : teams.data.length === 0 ? (
          <Text className="py-3 font-sans text-body text-ink-muted">I have no teams for this league yet.</Text>
        ) : (
          teams.data.map((team) => {
            const key = followKey(league, team.team);
            const on = picked.includes(key);
            const off = !on && full;
            return (
              <Pressable
                key={key}
                accessibilityRole="checkbox"
                accessibilityLabel={team.team}
                accessibilityState={{ checked: on, disabled: off }}
                disabled={off}
                onPress={() => setPicked(toggleFollow(picked, key))}
                className={`min-h-touch flex-row items-center gap-3 border-b-2 border-border py-2 ${off ? "opacity-50" : ""}`}
              >
                <Ionicons
                  name={on ? "checkbox" : "square-outline"}
                  size={24}
                  color={on ? colors.accent : colors.inkMuted}
                />
                <TeamMark crest={team.crest} code={team.code} />
                <Text className="min-w-0 flex-1 font-semibold text-row-title text-ink">{team.team}</Text>
              </Pressable>
            );
          })
        )}
      </View>
    </Sheet>
  );
}
