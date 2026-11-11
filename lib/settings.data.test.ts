import { beforeEach, describe, expect, it, vi } from "vitest";

import { hourLabel, timeZoneOptions, useSaveUserSettings, useUserSettings } from "@/lib/settings";
import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("user settings", () => {
  it("uses the defaults before the first change", async () => {
    respond({ data: null });
    expect(await runQuery(useUserSettings())).toMatchObject({
      timezone: "Asia/Manila",
      digestHour: 7,
      healthCheck: false,
    });
    respond({ error: new Error("down") });
    await expect(runQuery(useUserSettings())).rejects.toThrow("down");
  });

  it("maps the saved row", async () => {
    respond({
      data: {
        timezone: "Asia/Tokyo",
        digest_enabled: false,
        digest_hour: 6,
        home_shortcuts: [],
        ulam_limit: 150,
        ulam_avoid: ["pork"],
        followed_teams: ["PL:Arsenal"],
        followed_series: null,
        hidden_modules: ["gym"],
        health_check: null,
      },
    });
    expect(await runQuery(useUserSettings())).toMatchObject({
      timezone: "Asia/Tokyo",
      ulamAvoid: ["pork"],
      followedTeams: ["PL:Arsenal"],
      healthCheck: false,
    });
  });

  it("saves the whole row and shows the change at once", async () => {
    await runMutation(useSaveUserSettings(), { digestHour: 8, followedSeries: ["F1"] });
    expect(argsOf("upsert")[0][0]).toMatchObject({ digest_hour: 8, timezone: "Asia/Manila", followed_series: ["F1"] });
    expect(queryClient.setQueryData.mock.calls[0][1]).toMatchObject({ digestHour: 8 });
    respond({ error: new Error("down") });
    await expect(runMutation(useSaveUserSettings(), { digestHour: 9 })).rejects.toThrow("down");
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(["user-settings"], undefined);
  });

  it("labels hours and lists time zones once each", () => {
    expect([0, 7, 12, 18].map(hourLabel)).toEqual(["12:00 AM", "7:00 AM", "12:00 PM", "6:00 PM"]);
    const zones = timeZoneOptions("Asia/Manila").map((z) => z.value);
    expect(zones[0]).toBe("Asia/Manila");
    expect(new Set(zones).size).toBe(zones.length);
  });
});
