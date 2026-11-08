import { describe, expect, it, vi } from "vitest";

import { filterJobs, jobScore, lastErrorNotice, splitList, type JobMatch } from "@/lib/jobs";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/lib/clipboard", () => ({ copyText: vi.fn() }));
vi.mock("react-native", () => ({ Linking: {} }));

const job = (over: Partial<JobMatch>): JobMatch =>
  ({ status: "new", location: "Makati, Philippines", is_remote: false, ...over }) as JobMatch;

describe("filterJobs", () => {
  const list = [
    job({ id: "ph" }),
    job({ id: "sg", location: "Singapore" }),
    job({ id: "remote", location: "Remote", is_remote: true }),
    job({ id: "saved", status: "saved" }),
    job({ id: "hidden", status: "hidden" }),
  ];
  const ids = (filter: Parameters<typeof filterJobs>[1]) => filterJobs(list, filter).map((j) => j.id);

  it("never shows a hidden job", () => {
    expect(ids("all")).toEqual(["ph", "sg", "remote", "saved"]);
  });

  it("splits by place", () => {
    expect(ids("philippines")).toEqual(["ph", "saved"]);
    expect(ids("abroad")).toEqual(["sg"]);
    expect(ids("remote")).toEqual(["remote"]);
  });

  it("shows jobs that you moved on", () => {
    expect(ids("saved")).toEqual(["saved"]);
  });
});

describe("splitList", () => {
  it("cleans a typed list", () => {
    expect(splitList(" React Native, ,Supabase ")).toEqual(["React Native", "Supabase"]);
  });
});

describe("jobScore", () => {
  it("shows a dash and Not ranked for a job with no score", () => {
    expect(jobScore({ score: null })).toEqual({ value: "—", status: { label: "Not ranked", tone: "muted" } });
  });

  it("shows the score and its word", () => {
    expect(jobScore({ score: 4.5 })).toEqual({ value: "4.5", status: { label: "Strong fit", tone: "good" } });
    expect(jobScore({ score: 3 })).toEqual({ value: "3.0", status: { label: "Weak fit", tone: "watch" } });
  });
});

describe("lastErrorNotice", () => {
  it("says why the last search stopped", () => {
    expect(lastErrorNotice("groq_busy")?.tone).toBe("warning");
    expect(lastErrorNotice("search_down")?.text).toContain("the job site did not answer");
    expect(lastErrorNotice("failed")?.tone).toBe("danger");
    expect(lastErrorNotice(null)).toBeNull();
  });
});
