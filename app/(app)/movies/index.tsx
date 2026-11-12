import { format, isToday, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Poster } from "@/components/movies/Poster";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleGate } from "@/components/ui/ModuleGate";
import { ModuleHeader, useHeaderScroll } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import {
  groupSoon,
  MOVIE_LISTS,
  openedText,
  ratingText,
  soonText,
  TMDB_CREDIT,
  useMovies,
  type Movie,
  type MovieListId,
} from "@/lib/movies";

function syncTime(at: string) {
  const d = parseISO(at);
  return `${isToday(d) ? "" : `${format(d, "MMM d")}, `}${format(d, "h:mm a")}`;
}

function FilmRow({ movie, value, last }: { movie: Movie; value: string | null; last: boolean }) {
  const detail = [openedText(movie.release_date), movie.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ");
  return (
    <DataRow
      leading={<Poster path={movie.poster_path} title={movie.title} />}
      title={movie.title}
      detail={detail || undefined}
      value={value ?? undefined}
      onPress={() => router.push({ pathname: "/movies/[id]", params: { id: String(movie.tmdb_id) } })}
      last={last}
    />
  );
}

/** Films in Philippine cinemas. Read-only: a film opens its detail screen. */
function MoviesScreen() {
  const { scrollY, onScroll } = useHeaderScroll();
  const colors = useColors();
  const movies = useMovies();
  const [list, setList] = useState<MovieListId>("now");
  const [now] = useState(() => new Date());
  const data = movies.data;
  const sync = data?.sync;
  const failed = sync?.last_error_at && (!sync.last_ok_at || sync.last_error_at > sync.last_ok_at);
  const films = data?.[list] ?? [];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        scrollY={scrollY}
        title="Movies"
        tone="daily"
        subtitle={`In Philippine cinemas${sync?.last_ok_at ? ` · Updated ${syncTime(sync.last_ok_at)}` : ""}`}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerClassName="gap-4 px-5 pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={movies.isRefetching}
            onRefresh={() => void movies.refetch()}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Segmented label="Show" options={MOVIE_LISTS} value={list} onChange={setList} />
        {failed && sync?.last_ok_at ? (
          <Notice tone="warning">Could not update. Showing the films from {syncTime(sync.last_ok_at)}.</Notice>
        ) : null}

        {movies.isPending ? (
          <Skeleton />
        ) : movies.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load the films. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => void movies.refetch()} />
          </View>
        ) : films.length === 0 ? (
          <EmptyState drawing="list" title="I have no films yet" body="I check every morning at 6 AM." />
        ) : list === "now" ? (
          <View>
            {films.map((m, i) => (
              <FilmRow
                key={m.tmdb_id}
                movie={m}
                value={ratingText(m) ? `${ratingText(m)} TMDB` : "Not rated yet"}
                last={i === films.length - 1}
              />
            ))}
          </View>
        ) : (
          groupSoon(films, now).map((group) => (
            <View key={group.title}>
              <Text accessibilityRole="header" className="py-2 font-semibold text-heading text-ink">
                {group.title}
              </Text>
              {group.movies.map((m, i) => (
                <FilmRow
                  key={m.tmdb_id}
                  movie={m}
                  value={soonText(m.release_date, now)}
                  last={i === group.movies.length - 1}
                />
              ))}
            </View>
          ))
        )}
        <Text className="font-sans text-caption text-ink-muted">{TMDB_CREDIT}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Needs TMDB_KEY on the server; see ModuleGate. */
export default function MoviesScreenGated() {
  return (
    <ModuleGate id="movies" tone="daily">
      <MoviesScreen />
    </ModuleGate>
  );
}
