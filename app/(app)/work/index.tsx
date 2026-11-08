import { Ionicons } from "@expo/vector-icons";
import { format, isToday, parseISO } from "date-fns";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DataRow } from "@/components/ui/DataRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleHeader } from "@/components/ui/ModuleHeader";
import { Notice } from "@/components/ui/Notice";
import { useColors } from "@/lib/colors";
import {
  filterJobs,
  JOB_FILTERS,
  jobScore,
  lastErrorNotice,
  useJobs,
  useRefreshJobs,
  type JobFilter,
  type JobMatch,
} from "@/lib/jobs";
import { useVoiceAccess } from "@/lib/voice";

function detail(job: JobMatch): string {
  return [job.company, job.location, job.visa_offered ? "Visa offered" : null].filter(Boolean).join(" · ");
}

export default function FindWorkScreen() {
  const colors = useColors();
  const access = useVoiceAccess();
  const jobs = useJobs();
  const refresh = useRefreshJobs();
  const [filter, setFilter] = useState<JobFilter>("all");

  const profile = jobs.data?.profile;
  const list = filterJobs(jobs.data?.matches ?? [], filter);
  const lastOk = profile?.last_ok_at ? parseISO(profile.last_ok_at) : null;
  const lastRun = profile?.last_run_at ? parseISO(profile.last_run_at) : null;
  const notice = lastErrorNotice(profile?.last_error ?? null);
  // A run that stopped before it saved anything: the header says when it stopped.
  const stopped = notice?.tone === "danger" && lastRun && (!lastOk || lastRun > lastOk);
  const when = (date: Date) => `${isToday(date) ? "today" : format(date, "MMM d")}, ${format(date, "h:mm a")}`;
  const updated =
    stopped && lastRun
      ? `Last search stopped ${when(lastRun)}`
      : lastOk
        ? `Updated ${when(lastOk)} · ${profile?.last_new_count} new ${profile?.last_new_count === 1 ? "match" : "matches"}`
        : undefined;

  if (access.data && !access.data.isAdmin) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
        <ModuleHeader title="Find a work" tone="records" />
        <EmptyState drawing="box" title="Find a work is for the admin." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-surface-page">
      <ModuleHeader
        title="Find a work"
        subtitle={updated}
        tone="records"
        action={
          profile ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh jobs"
              accessibilityState={{ busy: refresh.isPending }}
              disabled={refresh.isPending}
              onPress={() => refresh.mutate()}
              className="h-touch w-touch items-center justify-center"
            >
              {refresh.isPending ? (
                <ActivityIndicator color={colors.onShell} />
              ) : (
                <Ionicons name="refresh" size={22} color={colors.onShell} />
              )}
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerClassName="gap-4 px-5 pb-8 pt-4">
        {jobs.isPending ? (
          <ActivityIndicator color={colors.accent} className="py-8" />
        ) : jobs.error ? (
          <View className="gap-3">
            <Notice tone="danger">Could not load your jobs. Check your connection.</Notice>
            <Button label="Try again" variant="secondary" size="input" onPress={() => jobs.refetch()} />
          </View>
        ) : !profile ? (
          <View className="gap-3">
            <Text className="font-bold text-title text-ink">Tell me what work you want</Text>
            <Text className="font-sans text-body text-ink-muted">
              Upload your resume, and I draft your work profile. You can also type it.
            </Text>
            <Button
              label="Upload resume (PDF)"
              onPress={() => router.push({ pathname: "/work/profile", params: { upload: "1" } })}
            />
            <Button label="Type my profile" variant="secondary" onPress={() => router.push("/work/profile")} />
          </View>
        ) : (
          <>
            {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
            {refresh.error ? <Notice tone="danger">{refresh.error.message}</Notice> : null}
            <View accessibilityRole="radiogroup" accessibilityLabel="Filter" className="flex-row flex-wrap gap-2">
              {JOB_FILTERS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  variant="filter"
                  selected={item.value === filter}
                  onPress={() => setFilter(item.value)}
                />
              ))}
            </View>
            {list.length === 0 && stopped && filter === "all" ? (
              <EmptyState drawing="box" title="No jobs yet" body="You can search now with the refresh button." />
            ) : list.length === 0 ? (
              <View className="gap-3">
                <Text className="font-bold text-title text-ink">No new matches today</Text>
                <Text className="font-sans text-body text-ink-muted">
                  I search again at 6 AM. A wider profile finds more.
                </Text>
                <Button label="Edit work profile" onPress={() => router.push("/work/profile")} />
              </View>
            ) : (
              <View>
                {list.map((job, index) => (
                  <DataRow
                    key={job.id}
                    title={job.title}
                    detail={detail(job)}
                    {...jobScore(job)}
                    onPress={() => router.push({ pathname: "/work/[id]", params: { id: job.id } })}
                    last={index === list.length - 1}
                  />
                ))}
              </View>
            )}
            <DataRow title="Edit work profile" onPress={() => router.push("/work/profile")} last />
            <Text className="font-sans text-caption text-ink-muted">Job data by freehire</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
