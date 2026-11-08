import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Linking } from "react-native";

import { copyText } from "@/lib/clipboard";
import { supabase } from "@/lib/supabase";
import { fitWord, NOT_RANKED, safeUrl, type ProfileDraft } from "@/supabase/functions/_shared/jobs";
import type { Tables } from "@/types/database";

export { fitWord } from "@/supabase/functions/_shared/jobs";

export type JobProfileRow = Tables<"job_profiles">;
export type JobMatch = Tables<"job_matches">;
export type JobStatus = "new" | "saved" | "applied" | "interview" | "hidden";
export type JobFilter = "all" | "philippines" | "abroad" | "remote" | "saved";

export const JOB_FILTERS: readonly { value: JobFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "philippines", label: "Philippines" },
  { value: "abroad", label: "Abroad" },
  { value: "remote", label: "Remote" },
  { value: "saved", label: "Saved" },
];

const inPhilippines = (j: JobMatch) => /philippines/i.test(j.location ?? "");

/** Hidden jobs stay out of every list. Saved also shows jobs that you moved further on. */
export function filterJobs(jobs: readonly JobMatch[], filter: JobFilter): JobMatch[] {
  const shown = jobs.filter((j) => j.status !== "hidden");
  switch (filter) {
    case "philippines":
      return shown.filter(inPhilippines);
    case "abroad":
      return shown.filter((j) => !inPhilippines(j) && !j.is_remote);
    case "remote":
      return shown.filter((j) => j.is_remote);
    case "saved":
      return shown.filter((j) => j.status !== "new");
    default:
      return shown;
  }
}

/** The number and the status word of a job. A job that Groq has not ranked shows a dash. */
export function jobScore(job: Pick<JobMatch, "score">): {
  value: string;
  status: { label: string; tone: "good" | "watch" | "muted" };
} {
  if (job.score === null) return { value: "—", status: { label: NOT_RANKED, tone: "muted" } };
  return {
    value: job.score.toFixed(1),
    status: { label: fitWord(job.score), tone: job.score >= 3.5 ? "good" : "watch" },
  };
}

export type LastSearchError = "groq_busy" | "search_down" | "failed";

/** Why the last search stopped, in the words of the Find a work notice. */
export function lastErrorNotice(code: string | null): { tone: "warning" | "danger"; text: string } | null {
  switch (code) {
    case "groq_busy":
      return {
        tone: "warning",
        text: "My last search could not rank every job, because Groq was busy. I rank them on the next search.",
      };
    case "search_down":
      return { tone: "danger", text: "My last search stopped: the job site did not answer. I try again at 6 AM." };
    case "failed":
      return { tone: "danger", text: "My last search stopped. I try again at 6 AM." };
    default:
      return null;
  }
}

/** "React Native, Supabase" to a clean list. */
export const splitList = (text: string) =>
  text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

async function functionMessage(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    return body?.error ?? fallback;
  }
  return "Could not reach the server. Check your connection.";
}

const KEY = ["jobs"] as const;

export function useJobs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [profile, matches] = await Promise.all([
        supabase.from("job_profiles").select("*").maybeSingle(),
        supabase
          .from("job_matches")
          .select("*")
          // Unranked jobs come after ranked ones, newest first.
          .order("score", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);
      if (profile.error) throw profile.error;
      if (matches.error) throw matches.error;
      return { profile: profile.data, matches: matches.data };
    },
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: KEY });
}

export function useRefreshJobs() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("job-search", { body: {} });
      if (error) throw new Error(await functionMessage(error, "Could not search today."));
    },
    onSettled: invalidate,
  });
}

export function useReadResume() {
  return useMutation({
    mutationFn: async (form: FormData): Promise<ProfileDraft> => {
      const { data, error } = await supabase.functions.invoke<ProfileDraft>("job-profile-draft", { body: form });
      if (error) {
        throw new Error(
          await functionMessage(
            error,
            "The server could not finish reading this PDF. Type your profile, or try a shorter file.",
          ),
        );
      }
      return data!;
    },
  });
}

export type ProfileInput = Pick<
  JobProfileRow,
  "skills" | "past_roles" | "wanted_jobs" | "countries" | "remote_ok" | "salary_floor"
>;

export function useSaveProfile() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("job_profiles")
        .upsert({ ...input, user_id: auth.user!.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

export function useDraftLetter() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (job: JobMatch) => {
      const { data, error } = await supabase.functions.invoke<{ letter: string }>("job-search", {
        body: { action: "letter", external_id: job.external_id },
      });
      if (error) throw new Error(await functionMessage(error, "Could not draft a letter."));
      const saved = await supabase.from("job_matches").update({ letter: data!.letter }).eq("id", job.id);
      if (saved.error) throw saved.error;
    },
    onSettled: invalidate,
  });
}

export function useUpdateJob() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      fields,
    }: {
      id: string;
      fields: Partial<Pick<JobMatch, "status" | "letter" | "applied_on">>;
    }) => {
      const { error } = await supabase.from("job_matches").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });
}

/** Copies the letter and opens the job. You press Submit on the employer page. Only https opens. */
export async function openApplication(job: JobMatch, letter: string | null): Promise<void> {
  const url = safeUrl(job.url);
  if (!url) throw new Error("This link is not safe to open.");
  if (letter) await copyText(letter);
  await Linking.openURL(url);
}
