import { Ionicons } from "@expo/vector-icons";
import { addMonths, format, isSameMonth } from "date-fns";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { nextActionText, publishStatus, VideoCard } from "@/components/content/VideoCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Fab } from "@/components/ui/Fab";
import { Input } from "@/components/ui/Input";
import { KeyboardScrollView } from "@/components/ui/KeyboardScrollView";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { Segmented } from "@/components/ui/Segmented";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useColors } from "@/lib/colors";
import { useSaveVideo, useVideos, type Video } from "@/lib/content";
import { daysFrom, nextStage, prevStage, STAGES, stage, urgency } from "@/lib/content/stages";

type PlannerView = "next" | "board" | "calendar" | "ideas";

const VIEWS = [
  { value: "next", label: "Next up" },
  { value: "board", label: "Board" },
  { value: "calendar", label: "Calendar" },
  { value: "ideas", label: "Ideas" },
] as const satisfies readonly { value: PlannerView; label: string }[];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ListCard({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

function Empty({ text }: { text: string }) {
  return <Text className="py-3 font-sans text-caption text-ink-muted">{text}</Text>;
}

function NextUp({ videos }: { videos: Video[] }) {
  const save = useSaveVideo();
  const [idea, setIdea] = useState("");
  const active = videos
    .filter((v) => v.stage !== "idea" && v.stage !== "published")
    .sort((a, b) => urgency(a) - urgency(b));
  const top = active[0];
  const week = videos
    .filter((v) => v.stage !== "published" && v.publish_on && daysFrom(v.publish_on) <= 6)
    .sort((a, b) => (a.publish_on ?? "").localeCompare(b.publish_on ?? ""));

  async function addIdea() {
    const title = idea.trim();
    if (!title) return;
    await save.mutateAsync({ input: { title, stage: "idea" } });
    setIdea("");
  }

  return (
    <>
      <Section title="Work on next">
        {top ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${top.title}. Next: ${nextActionText(top)}. Open video`}
            onPress={() => router.push({ pathname: "/content/video/[id]", params: { id: top.id } })}
            className="gap-2 rounded-card border border-border bg-surface-card p-4 active:bg-surface-muted"
          >
            <Text className="font-medium text-caption text-accent-strong">
              {stage(top.stage).label} stage{publishStatus(top) ? ` · ${publishStatus(top)!.text}` : ""}
            </Text>
            <Text className="font-bold text-title text-ink">{top.title}</Text>
            <Text className="font-sans text-body text-ink">{nextActionText(top)}</Text>
          </Pressable>
        ) : (
          <ListCard>
            <Empty text="Nothing in progress. Start an idea from Ideas, or add a video." />
          </ListCard>
        )}
      </Section>

      <Section title="Publishing this week">
        <ListCard>
          {week.length === 0 ? (
            <Empty text="No publish dates in the next 7 days." />
          ) : (
            week.map((v, i) => <VideoCard key={v.id} video={v} last={i === week.length - 1} />)
          )}
        </ListCard>
      </Section>

      <Section title="Quick idea">
        <View className="gap-3">
          <Input
            label="Idea"
            value={idea}
            onChangeText={setIdea}
            placeholder="A video about…"
            onSubmitEditing={addIdea}
          />
          <Button label="Save idea" variant="secondary" size="input" loading={save.isPending} onPress={addIdea} />
          {save.error ? <ErrorNotice error={save.error} /> : null}
        </View>
      </Section>

      {active.length > 1 ? (
        <Section title="In progress">
          <ListCard>
            {active.slice(1).map((v, i, list) => (
              <VideoCard key={v.id} video={v} last={i === list.length - 1} />
            ))}
          </ListCard>
        </Section>
      ) : null}
    </>
  );
}

function Board({ videos }: { videos: Video[] }) {
  const colors = useColors();
  const save = useSaveVideo();
  return (
    <>
      {save.error ? <ErrorNotice error={save.error} /> : null}
      {STAGES.map((s) => {
        const list = videos.filter((v) => v.stage === s.id).sort((a, b) => urgency(a) - urgency(b));
        return (
          <Section key={s.id} title={`${s.label} · ${list.length}`}>
            <ListCard>
              {list.length === 0 ? (
                <Empty text={`Nothing in ${s.label}.`} />
              ) : (
                list.map((v, i) => {
                  const prev = prevStage(v.stage);
                  const next = nextStage(v.stage);
                  return (
                    <View
                      key={v.id}
                      className={`flex-row items-center ${i === list.length - 1 ? "" : "border-b-2 border-border"}`}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          prev ? `Move ${v.title} back to ${prev.label}` : `${v.title} is in the first stage`
                        }
                        disabled={!prev}
                        onPress={() => prev && save.mutate({ id: v.id, input: { stage: prev.id } })}
                        className={`h-touch w-touch items-center justify-center ${prev ? "" : "opacity-0"}`}
                      >
                        <Ionicons name="chevron-back" size={20} color={colors.ink} />
                      </Pressable>
                      <View className="min-w-0 flex-1">
                        <VideoCard video={v} last />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={next ? `Move ${v.title} to ${next.label}` : `${v.title} is published`}
                        disabled={!next}
                        onPress={() => next && save.mutate({ id: v.id, input: { stage: next.id } })}
                        className={`h-touch w-touch items-center justify-center ${next ? "" : "opacity-0"}`}
                      >
                        <Ionicons name="chevron-forward" size={20} color={colors.ink} />
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ListCard>
          </Section>
        );
      })}
    </>
  );
}

function CalendarView({ videos }: { videos: Video[] }) {
  const now = new Date();
  const [month, setMonth] = useState(now);
  const [selected, setSelected] = useState<string | null>(format(now, "yyyy-MM-dd"));
  const byDay = new Map<string, Video[]>();
  for (const v of videos) {
    if (!v.publish_on) continue;
    byDay.set(v.publish_on, [...(byDay.get(v.publish_on) ?? []), v]);
  }
  const dayVideos = selected ? (byDay.get(selected) ?? []) : [];

  function changeMonth(by: number) {
    const next = addMonths(month, by);
    setMonth(next);
    setSelected(isSameMonth(next, now) ? format(now, "yyyy-MM-dd") : null);
  }

  return (
    <>
      <View>
        <MonthCalendar
          month={month}
          onPrevious={() => changeMonth(-1)}
          onNext={() => changeMonth(1)}
          canGoNext
          selected={selected}
          onSelect={setSelected}
          describeDay={(date) => {
            const n = byDay.get(date)?.length ?? 0;
            return n ? `${n} ${n === 1 ? "video" : "videos"} to publish` : undefined;
          }}
          renderDay={(date) => {
            const n = byDay.get(date)?.length ?? 0;
            return n ? <Badge label={String(n)} tone="neutral" /> : null;
          }}
        />
      </View>
      {selected ? (
        <Section title={format(new Date(`${selected}T00:00:00`), "EEEE, MMM d")}>
          <ListCard>
            {dayVideos.length === 0 ? (
              <Empty text="Nothing to publish on this day." />
            ) : (
              dayVideos.map((v, i) => <VideoCard key={v.id} video={v} last={i === dayVideos.length - 1} />)
            )}
          </ListCard>
        </Section>
      ) : (
        <Text className="font-sans text-caption text-ink-muted">Tap a day to see what publishes then.</Text>
      )}
    </>
  );
}

function Ideas({ videos }: { videos: Video[] }) {
  const colors = useColors();
  const save = useSaveVideo();
  const ideas = videos
    .filter((v) => v.stage === "idea")
    .sort((a, b) => b.priority - a.priority || b.created_at.localeCompare(a.created_at));
  return (
    <ListCard>
      {save.error ? <ErrorNotice error={save.error} /> : null}
      {ideas.length === 0 ? (
        <Empty text="No ideas yet. Use Quick idea in Next up, or Add idea below." />
      ) : (
        ideas.map((v, i) => {
          const starred = v.priority >= 2;
          return (
            <View
              key={v.id}
              className={`flex-row items-center gap-1 py-1 pr-3 ${i === ideas.length - 1 ? "" : "border-b-2 border-border"}`}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={starred ? `Unstar ${v.title}` : `Star ${v.title}`}
                accessibilityState={{ selected: starred }}
                onPress={() => save.mutate({ id: v.id, input: { priority: starred ? 1 : 2 } })}
                className="h-touch w-touch items-center justify-center"
              >
                <Ionicons
                  name={starred ? "star" : "star-outline"}
                  size={20}
                  color={starred ? colors.warning : colors.inkMuted}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${v.title}${v.hook ? `, hook: ${v.hook}` : ", no hook yet"}. Open idea`}
                onPress={() => router.push({ pathname: "/content/video/[id]", params: { id: v.id } })}
                className="min-h-touch min-w-0 flex-1 justify-center gap-1 py-2"
              >
                <Text numberOfLines={1} className="font-semibold text-row-title text-ink">
                  {v.title}
                </Text>
                <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                  {v.hook || "Add a hook"}
                </Text>
              </Pressable>
              <Button
                label="Start"
                variant="secondary"
                size="input"
                onPress={() => save.mutate({ id: v.id, input: { stage: "script" } })}
              />
            </View>
          );
        })
      )}
    </ListCard>
  );
}

export default function ContentPlannerScreen() {
  const [view, setView] = useState<PlannerView>("next");
  const videos = useVideos();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="records">
        <Text accessibilityRole="header" className="font-bold text-title text-ink">
          Content planner
        </Text>
      </ModuleBar>

      <KeyboardScrollView contentContainerClassName="gap-5 px-5 pb-fab-clear pt-2">
        <Segmented label="View" options={VIEWS} value={view} onChange={setView} />
        {videos.isPending ? (
          <Skeleton />
        ) : videos.error ? (
          <View className="gap-3">
            <ErrorNotice lead="Could not load your videos." error={videos.error} />
            <Button label="Try again" variant="secondary" size="input" onPress={() => videos.refetch()} />
          </View>
        ) : view === "next" ? (
          <NextUp videos={videos.data} />
        ) : view === "board" ? (
          <Board videos={videos.data} />
        ) : view === "calendar" ? (
          <CalendarView videos={videos.data} />
        ) : (
          <Ideas videos={videos.data} />
        )}
      </KeyboardScrollView>

      <Fab
        label={view === "ideas" ? "Add idea" : "Add video"}
        onPress={() =>
          router.push({ pathname: "/content/video/new", params: view === "ideas" ? { stage: "idea" } : {} })
        }
      />
    </SafeAreaView>
  );
}
