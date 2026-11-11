import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Poster } from "@/components/movies/Poster";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Skeleton } from "@/components/ui/Skeleton";
import { MIN_VOTES, openedText, openTrailer, ratingText, runtimeText, TMDB_CREDIT, useMovie } from "@/lib/movies";

/** One film: the poster, the facts, the story and the trailer. Read-only, so no primary button. */
export default function MovieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movie = useMovie(Number(id));
  const film = movie.data;
  const rating = film ? ratingText(film) : null;
  const opened = film ? openedText(film.release_date, undefined, true) : null;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader title={film?.title ?? "Movies"} tone="daily" />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {movie.isPending ? (
          <Skeleton layout="detail" />
        ) : movie.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load this film. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => void movie.refetch()} />
          </View>
        ) : !film ? (
          <View className="gap-3">
            <EmptyState
              drawing="list"
              title="This film left the lists"
              body="I keep the films in cinemas now and the next ones."
            />
            <Button label="Back to Movies" variant="secondary" onPress={() => router.replace("/movies")} />
          </View>
        ) : (
          <>
            <View className="flex-row gap-4">
              <Poster path={film.poster_path} title={film.title} large />
              <View className="min-w-0 flex-1 gap-2">
                <Text className="font-semibold text-row-title text-ink">
                  {rating ? `${rating} TMDB` : "Not rated yet"}
                </Text>
                {rating ? (
                  <Text className="font-sans text-caption text-ink-muted">
                    {film.vote_count.toLocaleString("en-PH")} votes
                  </Text>
                ) : (
                  <Text className="font-sans text-caption text-ink-muted">Fewer than {MIN_VOTES} votes</Text>
                )}
                {[opened, runtimeText(film.runtime_min), film.genres.join(", ")].filter(Boolean).map((line) => (
                  <Text key={line} className="font-sans text-label text-ink">
                    {line}
                  </Text>
                ))}
              </View>
            </View>
            {film.overview ? <Text className="font-sans text-body text-ink">{film.overview}</Text> : null}
            {film.trailer_key ? (
              <Button label="Watch trailer" variant="secondary" onPress={() => void openTrailer(film.trailer_key!)} />
            ) : (
              <Text className="font-sans text-label text-ink-muted">No trailer yet</Text>
            )}
            <Text className="font-sans text-caption text-ink-muted">{TMDB_CREDIT}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
