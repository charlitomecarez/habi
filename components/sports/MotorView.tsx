import { format, isToday, parseISO } from "date-fns";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import {
  lastRace,
  lateNightLine,
  nextRace,
  openRace,
  raceWhen,
  SERIES,
  useMotor,
  type MotorRace,
  type MotorStanding,
  type SeriesId,
} from "@/lib/motor";
import { useSaveUserSettings, useUserSettings } from "@/lib/settings";

type View3 = "races" | "people" | "teams";

/** Shows 3 of the last race's top 10 until you ask for all. */
const SHORT_RESULTS = 3;

function Header({ children }: { children: string }) {
  return (
    <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
      {children}
    </Text>
  );
}

function StandingsTable({ rows, people }: { rows: MotorStanding[]; people: string }) {
  const head = "w-chip text-right font-semibold text-badge text-ink-muted";
  const cell = "w-chip text-right font-sans text-label text-ink";
  return (
    <View>
      <View className="flex-row items-center gap-1 border-b-2 border-border py-2">
        <Text className="w-6 font-semibold text-badge text-ink-muted">#</Text>
        <Text className="min-w-0 flex-1 font-semibold text-badge text-ink-muted">{people}</Text>
        <Text className={head}>Pts</Text>
        <Text className={head}>Wins</Text>
      </View>
      {rows.map((row) => (
        <View key={row.name} className="flex-row items-center gap-1 border-b-2 border-border py-2">
          <Text className="w-6 font-sans text-label text-ink">{row.position}</Text>
          <View className="min-w-0 flex-1">
            <Text className="font-semibold text-label text-ink">{row.name}</Text>
            {row.team ? <Text className="font-sans text-caption text-ink-muted">{row.team}</Text> : null}
          </View>
          <Text className={`${cell} font-semibold`}>{row.points}</Text>
          <Text className={cell}>{row.wins}</Text>
        </View>
      ))}
    </View>
  );
}

function roundStatus(race: MotorRace, next: MotorRace | null) {
  if (race.status === "cancelled") return { label: "Cancelled", tone: "muted" as const };
  if (race.status === "final") return { label: "Final", tone: "muted" as const };
  if (next && race.round === next.round) return { label: "Next", tone: "muted" as const };
  return undefined;
}

/** One series in Sports: the next race, the last result, the rounds, and the standings. */
export function MotorView({ series }: { series: SeriesId }) {
  const colors = useColors();
  const info = SERIES.find((s) => s.id === series)!;
  const [view, setView] = useState<View3>("races");
  const [allResults, setAllResults] = useState(false);
  const motor = useMotor(series);
  const settings = useUserSettings();
  const save = useSaveUserSettings();
  const followed = settings.data?.followedSeries ?? [];
  const onHome = followed.includes(series);

  const data = motor.data;
  const sync = data?.sync;
  const failed = sync?.last_error_at && (!sync.last_ok_at || sync.last_error_at > sync.last_ok_at);
  const lastOk = sync?.last_ok_at ? parseISO(sync.last_ok_at) : null;
  const updated = lastOk ? `${isToday(lastOk) ? "today" : format(lastOk, "MMM d")}, ${format(lastOk, "h:mm a")}` : null;
  const races = data?.races ?? [];
  const next = nextRace(races);
  const last = lastRace(races);
  const done = races.filter((r) => r.status === "final").length;
  const results = allResults ? (data?.results ?? []) : (data?.results ?? []).slice(0, SHORT_RESULTS);

  const views = [
    { value: "races", label: "Races" },
    { value: "people", label: info.people },
    { value: "teams", label: "Teams" },
  ] as const;

  const toggleHome = (on: boolean) =>
    save.mutate({ followedSeries: on ? [...followed, series] : followed.filter((s) => s !== series) });

  return (
    <>
      <DataRow
        title="Show on Home"
        detail="The next race and the winner"
        trailing={
          <Switch
            accessibilityLabel={`Show ${info.label} on Home`}
            value={onHome}
            disabled={!settings.data}
            onValueChange={toggleHome}
            trackColor={{ true: colors.accent }}
          />
        }
        last
      />
      <Segmented label="Show" options={views} value={view} onChange={setView} />

      {failed ? (
        <Notice tone="warning">
          Could not update {info.label}.{updated ? ` Showing the last data, from ${updated}.` : ""}
        </Notice>
      ) : null}

      {motor.isPending ? (
        <Skeleton />
      ) : motor.error ? (
        <View className="gap-3">
          <Notice tone="danger">Could not load {info.label}. Check your connection.</Notice>
          <Button label="Try again" variant="secondary" size="input" onPress={() => motor.refetch()} />
        </View>
      ) : races.length === 0 ? (
        <EmptyState
          drawing="calendar"
          title={`I have no ${info.label} data yet`}
          body="I check every morning, and every 2 hours on a race weekend."
        />
      ) : view === "races" ? (
        <>
          {next ? (
            <View>
              <Header>{`Next race · Round ${next.round}`}</Header>
              <DataRow
                title={next.name}
                detail={[
                  raceWhen(next.starts_at),
                  lateNightLine(next.starts_at),
                  [next.circuit, next.sprint_at ? `Sprint ${raceWhen(next.sprint_at)}` : null]
                    .filter(Boolean)
                    .join(" · "),
                ]
                  .filter(Boolean)
                  .join("\n")}
                onPress={() => void openRace(next)}
                chevron
                last
              />
            </View>
          ) : (
            <EmptyState
              drawing="calendar"
              title="The season is over"
              body="The first race of next season shows here when the calendar is out. I check every morning."
            />
          )}

          {last && results.length > 0 ? (
            <View>
              <Header>{`Last race · ${last.name}`}</Header>
              {results.map((r, index) => (
                <DataRow
                  key={r.position}
                  leading={<Text className="w-6 font-semibold text-label text-ink">{r.position}</Text>}
                  title={r.name}
                  detail={r.team}
                  value={String(r.points)}
                  last={index === results.length - 1}
                />
              ))}
              {!allResults && (data?.results.length ?? 0) > SHORT_RESULTS ? (
                <Button
                  label={`Show all ${data?.results.length}`}
                  variant="plain"
                  size="input"
                  onPress={() => setAllResults(true)}
                />
              ) : null}
            </View>
          ) : null}

          <View>
            <Header>{`Season · ${done} of ${races.length} rounds done`}</Header>
            {races.map((race, index) => (
              <DataRow
                key={race.round}
                title={`Round ${race.round} · ${race.name}`}
                detail={race.status === "cancelled" ? undefined : raceWhen(race.starts_at)}
                status={roundStatus(race, next)}
                onPress={race.status === "cancelled" ? undefined : () => void openRace(race)}
                last={index === races.length - 1}
              />
            ))}
          </View>
        </>
      ) : (view === "people" ? data?.riders : data?.teams)?.length ? (
        <StandingsTable
          rows={(view === "people" ? data?.riders : data?.teams) ?? []}
          people={view === "people" ? info.people.slice(0, -1) : "Team"}
        />
      ) : (
        <EmptyState drawing="list" title="No standings yet" body="They show after the first race of the season." />
      )}
    </>
  );
}
