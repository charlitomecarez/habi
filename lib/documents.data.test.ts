import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  documentStatus,
  typeLabel,
  useDeleteDocument,
  useDocument,
  useDocuments,
  useSaveDocument,
  useSetDocumentPhotos,
} from "@/lib/documents";
import { runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond } from "@/lib/test/fake-supabase";
import { expectWriteErrors } from "@/lib/test/writes";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
});

describe("documents", () => {
  it("always gives the status a word", () => {
    const now = new Date(2026, 10, 11);
    expect(documentStatus({ expires_on: null }, now).text).toBe("No expiry");
    expect(documentStatus({ expires_on: "2026-11-01" }, now).text).toBe("Expired Nov 1, 2026");
    expect(documentStatus({ expires_on: "2026-11-11" }, now).text).toBe("Due soon · today");
    expect(documentStatus({ expires_on: "2026-11-12" }, now).text).toBe("Due soon · in 1 day");
    expect(documentStatus({ expires_on: "2026-11-20" }, now).text).toBe("Due soon · in 9 days");
    expect(documentStatus({ expires_on: "2027-11-20" }, now).text).toBe("Valid until Nov 20, 2027");
    expect(typeLabel("passport")).toBe("Passport");
    expect(typeLabel("x" as never)).toBe("Document");
  });

  it("reads and writes documents", async () => {
    respond({ data: [{ id: "d1" }] });
    expect(await runQuery(useDocuments())).toEqual([{ id: "d1" }]);
    expect(useDocument("d1").data).toBeUndefined();
    respond({ error: new Error("down") });
    await expect(runQuery(useDocuments())).rejects.toThrow("down");

    const input = {
      type: "passport" as const,
      name: "Passport",
      number: null,
      issuedOn: new Date(2020, 0, 2),
      expiresOn: null,
      remindDaysBefore: 30,
      vehicleId: null,
      note: null,
    };
    await runMutation(useSaveDocument(), { input });
    await runMutation(useSaveDocument(), {
      id: "d1",
      input: { ...input, issuedOn: null, expiresOn: new Date(2030, 0, 2) },
    });
    await runMutation(useSetDocumentPhotos(), { id: "d1", paths: ["a"] });
    await runMutation(useDeleteDocument(), "d1");
    expect(argsOf("insert")[0][0]).toMatchObject({ issued_on: "2020-01-02", expires_on: null });
    expect(argsOf("update")[0][0]).toMatchObject({ issued_on: null, expires_on: "2030-01-02" });
    await expectWriteErrors([
      [useSaveDocument(), { input }],
      [useSetDocumentPhotos(), { id: "d", paths: [] }],
      [useDeleteDocument(), "d"],
    ]);
  });
});
