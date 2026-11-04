// Ported from content-planner/src/lib/stages.ts. No framework code; my-app column names.
import { differenceInCalendarDays, format, parseISO } from "date-fns";

import type { Enums } from "@/types/database";

export type StageId = Enums<"content_stage">;
export type VideoFormat = Enums<"content_format">;

/** The fields the stage logic reads from a video row. */
export type StageFields = { stage: StageId; done_steps: string[]; format: VideoFormat };

export type Step = {
  id: string;
  label: string;
  /** Claude Code command in video-editing-workflow that does this step */
  cmd?: string;
};

export type Stage = { id: StageId; label: string; steps: Step[] };

export const STAGES: Stage[] = [
  {
    id: "idea",
    label: "Idea",
    steps: [
      { id: "idea.hook", label: "Write the hook in one line" },
      { id: "idea.format", label: "Pick the format and platforms" },
    ],
  },
  {
    id: "script",
    label: "Script",
    steps: [
      { id: "script.draft", label: "Draft the script", cmd: "/script" },
      { id: "script.punchup", label: "Punch it up", cmd: "/punchup" },
      { id: "script.read", label: "Read it out loud once" },
    ],
  },
  {
    id: "record",
    label: "Record",
    steps: [
      { id: "record.voice", label: "Record voice and footage", cmd: "/record" },
      { id: "record.prep", label: "Prep the footage", cmd: "/edit" },
      { id: "record.broll", label: "Collect B-roll" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    steps: [
      { id: "edit.graphics", label: "Make the graphics", cmd: "/graphics" },
      { id: "edit.roughcut", label: "Build the rough cut", cmd: "/roughcut" },
    ],
  },
  {
    id: "polish",
    label: "Polish",
    steps: [
      { id: "polish.kdenlive", label: "Polish the edit in Kdenlive" },
      { id: "polish.thumbnail", label: "Make the thumbnail", cmd: "/thumbnail" },
      { id: "polish.export", label: "Export the final video" },
    ],
  },
  {
    id: "publish",
    label: "Publish",
    steps: [
      { id: "publish.meta", label: "Write the title, description and captions", cmd: "/publish" },
      { id: "publish.upload", label: "Upload and schedule" },
      { id: "publish.reel", label: "Cut the reel", cmd: "/reel" },
    ],
  },
  { id: "published", label: "Published", steps: [] },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

export const PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "youtube-shorts", label: "Shorts" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram-reels", label: "Reels" },
  { id: "facebook", label: "Facebook" },
];

/** Platforms you can mark a video as posted on. */
export const POST_PLATFORMS = [
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
];

export function platformLabel(id: string): string {
  return PLATFORMS.find((p) => p.id === id)?.label ?? POST_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

export function stage(id: StageId): Stage {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export function stageIndex(id: StageId): number {
  return Math.max(0, STAGE_IDS.indexOf(id));
}

export function nextStage(id: StageId): Stage | null {
  return STAGES[stageIndex(id) + 1] ?? null;
}

export function prevStage(id: StageId): Stage | null {
  const i = stageIndex(id);
  return i > 0 ? STAGES[i - 1] : null;
}

/** Steps that don't apply to a format. Shorts have no separate reel cut. */
export function stepsFor(s: Stage, videoFormat: VideoFormat): Step[] {
  return videoFormat === "short" ? s.steps.filter((st) => st.id !== "publish.reel") : s.steps;
}

export type NextAction =
  { kind: "step"; step: Step; stage: Stage } | { kind: "advance"; to: Stage; stage: Stage } | { kind: "done" };

/** What to do next on a video: the first unchecked step of its stage, or moving it on. */
export function nextAction(v: StageFields): NextAction {
  const s = stage(v.stage);
  if (s.id === "published") return { kind: "done" };
  const step = stepsFor(s, v.format).find((st) => !v.done_steps.includes(st.id));
  if (step) return { kind: "step", step, stage: s };
  return { kind: "advance", to: nextStage(s.id)!, stage: s };
}

/** 0..1 progress through the whole pipeline. */
export function progress(v: StageFields): number {
  const all = STAGES.flatMap((s) => stepsFor(s, v.format));
  if (v.stage === "published") return 1;
  const before = STAGES.slice(0, stageIndex(v.stage)).flatMap((s) => stepsFor(s, v.format));
  const current = stepsFor(stage(v.stage), v.format).filter((st) => v.done_steps.includes(st.id));
  return (before.length + current.length) / all.length;
}

/** The command for a step, with the project folder when the video has one. */
export function commandFor(step: Step, projectSlug: string): string | null {
  if (!step.cmd) return null;
  const needsProject = ["/record", "/edit", "/graphics", "/roughcut", "/thumbnail", "/publish", "/reel"];
  if (projectSlug && needsProject.includes(step.cmd)) return `${step.cmd} projects/${projectSlug}`;
  return step.cmd;
}

// ---------------------------------------------------------------------------
// Dates. my-app stores publish_on as a plain "yyyy-MM-dd" date, so nothing shifts across time zones.
// ---------------------------------------------------------------------------

/** Whole days from today to the date (negative = past). */
export function daysFrom(date: string, now = new Date()): number {
  return differenceInCalendarDays(parseISO(date), now);
}

/** "today", "tomorrow", "yesterday", "3 days late", "Friday" or "in 12 days". */
export function relativeDay(date: string, now = new Date()): string {
  const n = daysFrom(date, now);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n < 0) return `${-n} days late`;
  if (n < 7) return format(parseISO(date), "EEEE");
  return `in ${n} days`;
}

/** Sort key for "what to work on": late first, then soonest publish date, then priority. */
export function urgency(v: { publish_on: string | null; priority: number }, now = new Date()): number {
  const days = v.publish_on ? daysFrom(v.publish_on, now) : 60;
  return days * 10 - v.priority * 15;
}
