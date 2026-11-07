import { describe, expect, it, vi } from "vitest";

import { filterJobs, splitList, type JobMatch } from "@/lib/jobs";

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
