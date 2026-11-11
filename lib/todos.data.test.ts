import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";
import { useDeleteTodo, useSaveTodo, useTodo, useTodos, useToggleTodo } from "@/lib/todos";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("todos data", () => {
  it("reads open todos and the ones done in the last 30 days", async () => {
    respond({ data: [{ id: "t1" }] });
    expect(await runQuery(useTodos())).toEqual([{ id: "t1" }]);
    expect(String(argsOf("or")[0][0])).toMatch(/^completed_at\.is\.null,completed_at\.gte\./);
    expect(useTodo("t1").data).toBeUndefined();
    respond({ error: new Error("down") });
    await expect(runQuery(useTodos())).rejects.toThrow("down");
  });

  it("saves and deletes a todo", async () => {
    const input = { title: "Pay rent" } as never;
    await runMutation(useSaveTodo(), { input });
    await runMutation(useSaveTodo(), { id: "t1", input });
    await runMutation(useDeleteTodo(), "t1");
    expect(argsOf("insert")[0][0]).toEqual({ title: "Pay rent" });
    await expectWriteErrors([
      [useSaveTodo(), { input }],
      [useDeleteTodo(), "t"],
    ]);
  });

  it("ticks a todo before the server answers, and rolls back on an error", async () => {
    queryClient.getQueryData.mockReturnValue([{ id: "t1", completed_at: null }]);
    await runMutation(useToggleTodo(), { id: "t1", done: true });
    const update = queryClient.setQueryData.mock.calls[0][1] as (t: unknown[]) => { completed_at: string | null }[];
    expect(
      update([
        { id: "t1", completed_at: null },
        { id: "t2", completed_at: null },
      ])[0].completed_at,
    ).toEqual(expect.any(String));
    respond({ error: new Error("down") });
    await expect(runMutation(useToggleTodo(), { id: "t1", done: false })).rejects.toThrow("down");
    expect(argsOf("update")[1][0]).toEqual({ completed_at: null });
    expect(queryClient.setQueryData).toHaveBeenLastCalledWith(["todos"], [{ id: "t1", completed_at: null }]);
    queryClient.getQueryData.mockReturnValue(undefined);
  });
});
