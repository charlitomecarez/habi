import { format, parseISO } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { Segmented } from "@/components/ui/Segmented";
import { useColors } from "@/lib/colors";
import {
  fitWord,
  openApplication,
  useDraftLetter,
  useJobs,
  useUpdateJob,
  type JobMatch,
  type JobStatus,
} from "@/lib/jobs";
import { toDateString } from "@/lib/money";

const STATUSES = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "hidden", label: "Hidden" },
] as const;

function JobBody({ job }: { job: JobMatch }) {
  const draft = useDraftLetter();
  const update = useUpdateJob();
  const [edited, setEdited] = useState<string | null>(null);
  const [openFailed, setOpenFailed] = useState(false);
  const letter = edited ?? job.letter;

  async function apply(text: string | null) {
    setOpenFailed(false);
    if (text !== null && text !== job.letter) update.mutate({ id: job.id, fields: { letter: text } });
    await openApplication(job, text).catch(() => setOpenFailed(true));
  }

  function setStatus(status: JobStatus) {
    update.mutate({
      id: job.id,
      fields: { status, applied_on: status === "applied" ? toDateString(new Date()) : job.applied_on },
    });
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5 pb-8 pt-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} className="font-bold text-display text-ink">
          {job.score.toFixed(1)}
        </Text>
        <Text className={`font-semibold text-label ${job.score >= 3.5 ? "text-good" : "text-watch"}`}>
          {fitWord(job.score)}
        </Text>
      </View>
      <View className="gap-1">
        <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
          Why it fits
        </Text>
        <Text className="font-sans text-body text-ink">{job.reason}</Text>
      </View>

      {draft.error ? <Notice tone="danger">{draft.error.message}</Notice> : null}
      {openFailed ? <Notice tone="danger">Could not open this link.</Notice> : null}

      {letter ? (
        <>
          <Input label="Cover letter" value={letter} onChangeText={setEdited} multiline maxLength={6000} />
          <Notice tone="warning">Check the employer before you send personal data.</Notice>
          <Button label="Copy letter and open application" onPress={() => void apply(letter)} />
          <Text className="font-sans text-caption text-ink-muted">You press Submit on the employer page.</Text>
        </>
      ) : (
        <>
          <Button label="Draft cover letter" loading={draft.isPending} onPress={() => draft.mutate(job)} />
          <Button label="Open application with no letter" variant="secondary" onPress={() => void apply(null)} />
        </>
      )}

      <View className="gap-2">
        <Text accessibilityRole="header" className="font-semibold text-heading text-ink">
          Did you apply?
        </Text>
        <Segmented
          label="Status"
          options={STATUSES}
          value={(job.status === "new" ? "saved" : job.status) as (typeof STATUSES)[number]["value"]}
          onChange={setStatus}
        />
        {job.status === "applied" && job.applied_on ? (
          <Text className="font-sans text-caption text-ink-muted">
            Marked as Applied on {format(parseISO(job.applied_on), "MMM d")}.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

export default function JobScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobs = useJobs();
  const job = jobs.data?.matches.find((j) => j.id === id);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title={job?.title ?? "Job"}
        subtitle={job ? [job.company, job.location].filter(Boolean).join(" · ") : undefined}
        tone="records"
      />
      {job ? (
        <JobBody job={job} />
      ) : jobs.isPending ? (
        <ActivityIndicator color={colors.accent} className="py-8" />
      ) : (
        <Text className="p-5 text-center font-sans text-body text-ink-muted">This item no longer exists.</Text>
      )}
    </SafeAreaView>
  );
}
