import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { publishStatus } from "@/components/content/VideoCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmSheet } from "@/components/ui/ConfirmSheet";
import { DashedButton } from "@/components/ui/DashedButton";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/Notice";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { goBack } from "@/lib/navigation";
import { copyText } from "@/lib/clipboard";
import { ModuleBar } from "@/components/ui/ModuleHeader";
import { useColors } from "@/lib/colors";
import { useAddVideoTask, useDeleteVideo, useSaveVideo, useVideo, useVideoTasks, type Post } from "@/lib/content";
import {
  commandFor,
  nextAction,
  nextStage,
  platformLabel,
  POST_PLATFORMS,
  prevStage,
  progress,
  stage,
  stepsFor,
  type StageId,
} from "@/lib/content/stages";
import { useToggleTodo } from "@/lib/todos";

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1 border-b-2 border-border px-4 py-3">
      <Text className="font-sans text-caption text-ink-muted">{label}</Text>
      <Text className="font-sans text-body text-ink">{value}</Text>
    </View>
  );
}

export default function VideoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const video = useVideo(id);
  const save = useSaveVideo();
  const remove = useDeleteVideo();
  const tasks = useVideoTasks(id);
  const addTask = useAddVideoTask();
  const toggleTask = useToggleTodo();
  const [copied, setCopied] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"task" | { post: string } | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState<Date | null>(null);
  const [postUrl, setPostUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const v = video.data;

  async function copy(command: string) {
    await copyText(command);
    setCopied(command);
    setTimeout(() => setCopied((c) => (c === command ? null : c)), 2000);
  }

  if (!v) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-page px-5">
        {video.isPending ? (
          <View className="w-full flex-1 self-stretch pt-4">
            <Skeleton layout="detail" />
          </View>
        ) : (
          <View className="w-full gap-3">
            <Notice tone="danger">{video.error ? video.error.message : "This video was deleted."}</Notice>
            <Button label="Back" variant="secondary" size="input" onPress={goBack} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const current = stage(v.stage);
  const steps = stepsFor(current, v.format);
  const action = nextAction(v);
  const prev = prevStage(v.stage);
  const next = nextStage(v.stage);
  const status = publishStatus(v);
  const pct = Math.round(progress(v) * 100);
  const failure = save.error ?? remove.error ?? addTask.error ?? toggleTask.error;

  function toggleStep(stepId: string) {
    if (!v) return;
    const done = v.done_steps.includes(stepId);
    save.mutate({
      id: v.id,
      input: { done_steps: done ? v.done_steps.filter((s) => s !== stepId) : [...v.done_steps, stepId] },
    });
  }

  function moveTo(stageId: StageId) {
    if (!v) return;
    save.mutate({ id: v.id, input: { stage: stageId } });
  }

  async function saveTask() {
    if (!v || !taskTitle.trim()) return;
    await addTask.mutateAsync({ videoId: v.id, title: taskTitle.trim(), dueAt: taskDue });
    setTaskTitle("");
    setTaskDue(null);
    setSheet(null);
  }

  async function savePost(platform: string) {
    if (!v) return;
    const post: Post = { platform, postedAt: new Date().toISOString(), url: postUrl.trim() };
    await save.mutateAsync({ id: v.id, input: { posts: [...v.posts.filter((p) => p.platform !== platform), post] } });
    setPostUrl("");
    setSheet(null);
  }

  function removePost(platform: string) {
    if (!v) return;
    save.mutate({ id: v.id, input: { posts: v.posts.filter((p) => p.platform !== platform) } });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleBar tone="records">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="min-w-0 flex-1 font-bold text-title text-on-shell"
        >
          {v.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit video"
          onPress={() => router.push({ pathname: "/content/video/edit/[id]", params: { id: v.id } })}
          className="h-touch w-touch items-center justify-center"
        >
          <Ionicons name="create-outline" size={22} color={colors.onShell} />
        </Pressable>
      </ModuleBar>

      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-2">
        {failure ? <Notice tone="danger">{failure.message}</Notice> : null}

        <View className="gap-3">
          <View className="flex-row flex-wrap items-center gap-2">
            <Badge label={`${current.label} stage`} tone="neutral" />
            {status ? <Badge label={status.text} tone={status.tone} /> : null}
            <Text className="font-sans text-caption text-ink-muted">{pct}% done</Text>
          </View>
          <View className="h-bar overflow-hidden rounded-pill bg-divider">
            <View className="h-bar rounded-pill bg-accent" style={{ width: `${pct}%` }} />
          </View>
          <Text className="font-semibold text-label text-ink">
            {action.kind === "done"
              ? "Published. Nothing left to do."
              : action.kind === "advance"
                ? `Every ${current.label} step is done.`
                : `Next: ${action.step.label}`}
          </Text>
          {action.kind === "advance" ? (
            <Button label={`Move to ${action.to.label}`} size="input" onPress={() => moveTo(action.to.id)} />
          ) : null}
        </View>

        {steps.length > 0 ? (
          <Section title={`${current.label} checklist`}>
            <View>
              {steps.map((st, i) => {
                const done = v.done_steps.includes(st.id);
                const command = commandFor(st, v.project_slug);
                return (
                  <View
                    key={st.id}
                    className={`flex-row items-center gap-1 pr-2 ${i === steps.length - 1 ? "" : "border-b-2 border-border"}`}
                  >
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={st.label}
                      accessibilityState={{ checked: done }}
                      onPress={() => toggleStep(st.id)}
                      className="min-h-touch min-w-0 flex-1 flex-row items-center gap-3 py-3 active:bg-surface-muted"
                    >
                      <Ionicons
                        name={done ? "checkbox" : "square-outline"}
                        size={22}
                        color={done ? colors.accent : colors.inkMuted}
                      />
                      <View className="min-w-0 flex-1 gap-1">
                        <Text
                          className={`font-medium text-row-title ${done ? "text-ink-muted line-through" : "text-ink"}`}
                        >
                          {st.label}
                        </Text>
                        {command ? (
                          <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                            {command}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                    {command ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={copied === command ? "Copied" : `Copy ${command}`}
                        onPress={() => copy(command)}
                        className="h-touch min-w-touch flex-row items-center justify-center gap-1 rounded-pill px-2 active:bg-surface-muted"
                      >
                        <Ionicons
                          name={copied === command ? "checkmark" : "copy-outline"}
                          size={18}
                          color={copied === command ? colors.accent : colors.ink}
                        />
                        {copied === command ? (
                          <Text className="font-medium text-badge text-accent-strong">Copied</Text>
                        ) : null}
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Section>
        ) : null}

        <View className="flex-row gap-3">
          {prev ? (
            <View className="flex-1">
              <Button
                label={`Back to ${prev.label}`}
                variant="secondary"
                size="input"
                onPress={() => moveTo(prev.id)}
              />
            </View>
          ) : null}
          {next && action.kind !== "advance" ? (
            <View className="flex-1">
              <Button
                label={`Move to ${next.label}`}
                variant="secondary"
                size="input"
                onPress={() => moveTo(next.id)}
              />
            </View>
          ) : null}
        </View>

        <Section title="Tasks">
          <View>
            {(tasks.data ?? []).length === 0 ? (
              <Text className="py-3 font-sans text-caption text-ink-muted">
                No tasks. Tasks also show in Todos and get their reminders.
              </Text>
            ) : (
              tasks.data?.map((t, i) => {
                const done = t.completed_at !== null;
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${t.title}${t.due_at ? `, due ${format(parseISO(t.due_at), "MMM d, h:mm a")}` : ""}`}
                    accessibilityState={{ checked: done }}
                    onPress={() => toggleTask.mutate({ id: t.id, done: !done })}
                    className={`min-h-touch flex-row items-center gap-3 py-3 active:bg-surface-muted ${i === (tasks.data?.length ?? 0) - 1 ? "" : "border-b-2 border-border"}`}
                  >
                    <Ionicons
                      name={done ? "checkbox" : "square-outline"}
                      size={22}
                      color={done ? colors.accent : colors.inkMuted}
                    />
                    <View className="min-w-0 flex-1 gap-1">
                      <Text
                        className={`font-medium text-row-title ${done ? "text-ink-muted line-through" : "text-ink"}`}
                      >
                        {t.title}
                      </Text>
                      {t.due_at ? (
                        <Text className="font-sans text-caption text-ink-muted">
                          Due {format(parseISO(t.due_at), "MMM d, h:mm a")}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
          <DashedButton label="Add task" icon="add" onPress={() => setSheet("task")} />
        </Section>

        <Section title="Posts">
          <View>
            {POST_PLATFORMS.map((p, i) => {
              const post = v.posts.find((x) => x.platform === p.id);
              return (
                <View
                  key={p.id}
                  className={`min-h-touch flex-row items-center gap-3 px-4 py-3 ${i === POST_PLATFORMS.length - 1 ? "" : "border-b-2 border-border"}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="font-semibold text-row-title text-ink">{p.label}</Text>
                    <Text numberOfLines={1} className="font-sans text-caption text-ink-muted">
                      {post
                        ? `Posted ${format(parseISO(post.postedAt), "MMM d")}${post.url ? ` · ${post.url}` : ""}`
                        : "Not posted"}
                    </Text>
                  </View>
                  {post ? (
                    <Button label="Undo" variant="secondary" size="input" onPress={() => removePost(p.id)} />
                  ) : (
                    <Button
                      label="Mark posted"
                      variant="secondary"
                      size="input"
                      onPress={() => setSheet({ post: p.id })}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Section>

        <Section title="Details">
          <View>
            <Detail
              label="Publish date"
              value={v.publish_on ? format(parseISO(v.publish_on), "EEEE, MMMM d, yyyy") : "Not set"}
            />
            <Detail label="Format" value={v.format === "short" ? "Short" : "Long video"} />
            <Detail
              label="Platforms"
              value={v.platforms.length ? v.platforms.map(platformLabel).join(", ") : "None picked"}
            />
            <Detail label="Priority" value={["Low", "Normal", "High"][v.priority] ?? "Normal"} />
            <Detail label="Hook" value={v.hook || "Not written yet"} />
            <Detail label="Project folder" value={v.project_slug || "Not set"} />
            <Detail label="Notes" value={v.notes || "No notes"} />
          </View>
        </Section>

        <Button label="Delete video" variant="destructive" size="input" onPress={() => setConfirmDelete(true)} />
        <ConfirmSheet
          visible={confirmDelete}
          title="Delete this video?"
          body="Its tasks stay in Todos without the link."
          confirmLabel="Delete video"
          loading={remove.isPending}
          onConfirm={async () => {
            await remove.mutateAsync(v.id);
            goBack();
          }}
          onClose={() => setConfirmDelete(false)}
        />
      </ScrollView>

      <Sheet visible={sheet === "task"} onClose={() => setSheet(null)} title="Add task" subtitle={v.title}>
        <Input label="Task" value={taskTitle} onChangeText={setTaskTitle} placeholder="Buy a lavalier mic" />
        <DateTimeField label="Due (optional)" mode="datetime" value={taskDue} onChange={setTaskDue} />
        <Button label="Save task" loading={addTask.isPending} onPress={saveTask} />
      </Sheet>

      <Sheet
        visible={typeof sheet === "object" && sheet !== null}
        onClose={() => setSheet(null)}
        title={typeof sheet === "object" && sheet ? `Posted on ${platformLabel(sheet.post)}` : "Posted"}
      >
        <Input
          label="Link"
          optional
          value={postUrl}
          onChangeText={setPostUrl}
          placeholder="https://"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Button
          label="Save post"
          loading={save.isPending}
          onPress={() => typeof sheet === "object" && sheet && savePost(sheet.post)}
        />
      </Sheet>
    </SafeAreaView>
  );
}
