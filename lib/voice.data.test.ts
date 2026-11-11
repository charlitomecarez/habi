import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import {
  markInboxRead,
  useInbox,
  useRefreshVoice,
  useRetryVoice,
  useSendVoice,
  useSent,
  useSetVoiceAccess,
  useVoiceAccess,
  useVoiceAccounts,
} from "@/lib/voice";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("@/lib/photos", () => ({ currentUserId: vi.fn(async () => "u1") }));

const fail = { error: new Error("down") };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(4) })),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("voice reads", () => {
  it("reads admin, access and contacts", async () => {
    respond({ data: { user_id: "u1" } }, { data: true }, { data: null });
    expect(await runQuery(useVoiceAccess())).toEqual({ isAdmin: true, hasAccess: true, contacts: [] });
    expect(targets()).toEqual(["app_admins", "has_voice_access", "voice_contacts"]);
    respond({ data: null }, {}, fail);
    await expect(runQuery(useVoiceAccess())).rejects.toThrow("down");
  });

  it("reads the accounts, the inbox and the sent list", async () => {
    respond({ data: [{ user_id: "u2" }] }, { data: [{ id: "a" }] }, { data: [{ id: "b" }] });
    expect(await runQuery(useVoiceAccounts())).toEqual([{ user_id: "u2" }]);
    expect(await runQuery(useInbox())).toEqual([{ id: "a" }]);
    expect(await runQuery(useSent())).toEqual([{ id: "b" }]);
    expect(argsOf("eq")).toEqual([
      ["recipient_id", "u1"],
      ["user_id", "u1"],
    ]);
    for (const hook of [useVoiceAccounts(), useInbox(), useSent()]) {
      respond(fail);
      await expect(runQuery(hook)).rejects.toThrow("down");
    }
  });
});

describe("voice writes", () => {
  it("sets access and marks the inbox read", async () => {
    await runMutation(useSetVoiceAccess(), { userId: "u2", on: true });
    await markInboxRead();
    expect(argsOf("rpc")).toEqual([["set_voice_access", { p_user_id: "u2", p_on: true }], ["mark_voice_inbox_read"]]);
    respond(fail);
    await expect(runMutation(useSetVoiceAccess(), { userId: "u2", on: false })).rejects.toThrow("down");
    respond(fail);
    await expect(markInboxRead()).rejects.toThrow("down");
    await useRefreshVoice()();
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  it("uploads a phone recording as m4a, then asks for the text", async () => {
    respond({}, { data: { status: "ready" } });
    const status = await runMutation(useSendVoice(), {
      id: "r1",
      uri: "file:///a.m4a",
      durationS: 4,
      recipientId: "u2",
    });
    expect(status).toBe("ready");
    expect(argsOf("upload")[0][0]).toBe("u1/r1.m4a");
    expect(argsOf("invoke")[0]).toEqual([
      "voice-transcribe",
      { body: { path: "u1/r1.m4a", durationS: 4, recipientId: "u2" } },
    ]);
  });

  it("reuses a file that already exists, and uploads web audio as webm", async () => {
    respond({ error: new Error("The resource already exists") }, { data: null });
    expect(await runMutation(useSendVoice(), { id: "r2", uri: "blob:x", durationS: 2, recipientId: "u2" })).toBe(
      "failed",
    );
    expect(argsOf("upload")[0][2]).toEqual({ contentType: "audio/webm" });
    respond({ error: new Error("quota") });
    await expect(
      runMutation(useSendVoice(), { id: "r3", uri: "blob:x", durationS: 2, recipientId: "u2" }),
    ).rejects.toThrow("quota");
  });

  it("gives the function's own error sentence on a retry", async () => {
    const context = new Response(JSON.stringify({ error: "Too long" }), { status: 400 });
    respond({ error: { message: "Edge Function returned a non-2xx status code", context } });
    await expect(runMutation(useRetryVoice(), "m1")).rejects.toThrow("Too long");
    respond({ error: { message: "offline" } });
    await expect(runMutation(useRetryVoice(), "m1")).rejects.toThrow("offline");
    respond({ error: { message: "bad", context: new Response("not json") } });
    await expect(runMutation(useRetryVoice(), "m1")).rejects.toThrow("bad");
  });
});
