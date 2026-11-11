import { beforeEach, describe, expect, it, vi } from "vitest";

import { entryNeighbours, moodLabel, useDeleteEntry, useJournal, useSaveEntry, type JournalEntry } from "@/lib/journal";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
const photos = vi.hoisted(() => ({
  uploadPhoto: vi.fn(async (_b: string, name: string) => `journal/${name}.webp`),
  removePhoto: vi.fn(async () => {}),
}));
vi.mock("@/lib/photos", () => photos);

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

const photo = { uri: "f", width: 1, height: 1 };

describe("journal", () => {
  it("names moods and finds the neighbours of a day", () => {
    expect(moodLabel("good")).toBe("Good");
    expect(moodLabel(null)).toBeNull();
    const entries = [{ on_date: "3" }, { on_date: "2" }, { on_date: "1" }] as JournalEntry[];
    expect(entryNeighbours(entries, "2")).toEqual({ older: { on_date: "1" }, newer: { on_date: "3" } });
    expect(entryNeighbours(entries, "9")).toEqual({ older: undefined, newer: undefined });
  });

  it("reads the entries", async () => {
    respond({ data: [{ id: "e1" }] });
    expect(await runQuery(useJournal())).toEqual([{ id: "e1" }]);
    respond({ error: new Error("down") });
    await expect(runQuery(useJournal())).rejects.toThrow("down");
  });

  it("saves the day once, and swaps or removes the photo", async () => {
    await runMutation(useSaveEntry(), {
      date: "2026-11-11",
      mood: "good",
      body: "Hi",
      photo,
      currentPath: "journal/old.webp",
    });
    expect(argsOf("upsert")[0]).toEqual([
      { on_date: "2026-11-11", mood: "good", body: "Hi", photo_path: "journal/2026-11-11.webp" },
      { onConflict: "user_id,on_date" },
    ]);
    expect(photos.removePhoto).toHaveBeenCalledWith("journal/old.webp");
    await runMutation(useSaveEntry(), {
      date: "2026-11-11",
      mood: null,
      body: "",
      photo: null,
      currentPath: "journal/a.webp",
    });
    expect(argsOf("upsert")[1][0]).toMatchObject({ photo_path: null });
    await runMutation(useSaveEntry(), {
      date: "2026-11-11",
      mood: null,
      body: "",
      photo: undefined,
      currentPath: "journal/a.webp",
    });
    expect(argsOf("upsert")[2][0]).toMatchObject({ photo_path: "journal/a.webp" });
  });

  it("deletes an entry and its photo", async () => {
    await runMutation(useDeleteEntry(), { id: "e1", photo_path: "journal/a.webp" });
    expect(photos.removePhoto).toHaveBeenCalledWith("journal/a.webp");
    await expectWriteErrors([
      [useDeleteEntry(), { id: "e", photo_path: null }],
      [useSaveEntry(), { date: "d", mood: null, body: "", photo: undefined, currentPath: null }],
    ]);
  });
});
