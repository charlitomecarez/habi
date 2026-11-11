import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  openApplication,
  useDraftLetter,
  useJobs,
  useReadResume,
  useRefreshJobs,
  useSaveProfile,
  useUpdateJob,
  type JobMatch,
} from "@/lib/jobs";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("@/lib/clipboard", () => ({ copyText: vi.fn(async () => {}) }));
const linking = vi.hoisted(() => ({ openURL: vi.fn(async () => {}) }));
vi.mock("react-native", () => ({ Linking: linking }));

const job = { id: "j1", external_id: "x1", url: "https://jobs.example.com/1" } as JobMatch;
const httpError = (body: unknown) => new FunctionsHttpError(new Response(JSON.stringify(body), { status: 400 }));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("jobs data", () => {
  it("reads the profile and the matches", async () => {
    respond({ data: { skills: [] } }, { data: [job] });
    expect(await runQuery(useJobs())).toEqual({ profile: { skills: [] }, matches: [job] });
    respond({ error: new Error("a") }, {});
    await expect(runQuery(useJobs())).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runQuery(useJobs())).rejects.toThrow("b");
  });

  it("runs a search, and gives the server's sentence or a network sentence", async () => {
    await runMutation(useRefreshJobs());
    expect(argsOf("invoke")[0]).toEqual(["job-search", { body: {} }]);
    respond({ error: httpError({ error: "Daily limit reached." }) });
    await expect(runMutation(useRefreshJobs())).rejects.toThrow("Daily limit reached.");
    respond({ error: httpError({}) });
    await expect(runMutation(useRefreshJobs())).rejects.toThrow("Could not search today.");
    respond({ error: new Error("fetch failed") });
    await expect(runMutation(useRefreshJobs())).rejects.toThrow("Could not reach the server");
  });

  it("reads a resume into a draft", async () => {
    respond({ data: { skills: ["SQL"] } });
    expect(await runMutation(useReadResume(), new FormData())).toEqual({ skills: ["SQL"] });
    respond({ error: httpError({}) });
    await expect(runMutation(useReadResume(), new FormData())).rejects.toThrow("could not finish reading");
  });

  it("saves the profile for the signed-in account", async () => {
    respond({ data: { user: { id: "u1" } } });
    await runMutation(useSaveProfile(), { skills: ["SQL"] });
    expect(argsOf("upsert")[0]).toEqual([{ skills: ["SQL"], user_id: "u1" }, { onConflict: "user_id" }]);
    respond({ data: { user: { id: "u1" } } }, { error: new Error("rls") });
    await expect(runMutation(useSaveProfile(), {})).rejects.toThrow("rls");
  });

  it("drafts and saves a letter", async () => {
    respond({ data: { letter: "Dear team" } });
    await runMutation(useDraftLetter(), job);
    expect(argsOf("update")[0][0]).toEqual({ letter: "Dear team" });
    respond({ error: httpError({ error: "No credits" }) });
    await expect(runMutation(useDraftLetter(), job)).rejects.toThrow("No credits");
    respond({ data: { letter: "x" } }, { error: new Error("rls") });
    await expect(runMutation(useDraftLetter(), job)).rejects.toThrow("rls");
  });

  it("updates a job", async () => {
    await runMutation(useUpdateJob(), { id: "j1", fields: { status: "applied" } });
    expect(argsOf("eq")).toEqual([["id", "j1"]]);
    await expectWriteErrors([[useUpdateJob(), { id: "j1", fields: {} }]]);
  });

  it("copies the letter and opens only a safe link", async () => {
    const clipboard = await import("@/lib/clipboard");
    await openApplication(job, "Dear team");
    expect(clipboard.copyText).toHaveBeenCalledWith("Dear team");
    expect(linking.openURL).toHaveBeenCalledWith("https://jobs.example.com/1");
    await openApplication(job, null);
    await expect(openApplication({ ...job, url: "javascript:alert(1)" }, null)).rejects.toThrow("not safe");
  });
});
