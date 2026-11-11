import { expect } from "vitest";

import { runMutation } from "@/lib/test/fake-query";
import { respond } from "@/lib/test/fake-supabase";

/** Checks that each mutation throws the database error of its first call. */
export async function expectWriteErrors(cases: [hook: unknown, input: unknown][]): Promise<void> {
  for (const [hook, input] of cases) {
    respond({ error: new Error("write failed") });
    await expect(runMutation(hook, input)).rejects.toThrow("write failed");
  }
}
