import { describe, expect, it } from "vitest";

import { buildBackup, parseBackup } from "@/lib/vault-backup-file";

// Fake values. These are not real keys or entries.
const settings = {
  kdf: "argon2id13",
  kdf_salt: "c2FsdA==",
  kdf_ops_limit: 3,
  kdf_mem_limit: 67108864,
  key_check: "Y2hlY2s=",
  key_check_nonce: "bm9uY2U=",
};
const entries = [{ ciphertext: "Y2lwaGVy", nonce: "bm9uY2U=", version: 1 }];
const NOW = new Date("2026-11-05T01:00:00Z");

describe("vault backup file", () => {
  it("reads back what it wrote", () => {
    const backup = parseBackup(buildBackup(settings, entries, NOW));
    expect(backup?.settings).toEqual(settings);
    expect(backup?.entries).toEqual(entries);
  });

  it("drops anything extra, such as a user id", () => {
    const text = JSON.stringify({
      ...JSON.parse(buildBackup(settings, entries, NOW)),
      settings: { ...settings, user_id: "someone" },
    });
    expect(parseBackup(text)?.settings).not.toHaveProperty("user_id");
  });

  it("accepts a vault with no entries", () => {
    expect(parseBackup(buildBackup(settings, [], NOW))?.entries).toEqual([]);
  });

  it.each([
    ["bad JSON", "not json"],
    ["another file", JSON.stringify({ hello: "world" })],
    ["a newer version", JSON.stringify({ ...JSON.parse(buildBackup(settings, entries, NOW)), version: 2 })],
    ["missing settings", JSON.stringify({ ...JSON.parse(buildBackup(settings, entries, NOW)), settings: {} })],
  ])("refuses %s", (_label, text) => {
    expect(parseBackup(text)).toBeNull();
  });
});
