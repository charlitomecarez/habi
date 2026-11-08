import { describe, expect, it } from "vitest";

import {
  checkPin,
  createVault,
  createVersion1Vault,
  decryptEntry,
  encryptEntry,
  formatRecoveryCode,
  isVaultKey,
  newRecoveryCode,
  normalizeRecoveryCode,
  openWithPin,
  openWithRecovery,
  RECOVERY_LENGTH,
  unlockVault,
  wrapWithPassword,
  wrapWithPin,
  wrapWithRecovery,
  type VaultSettingsRow,
} from "@/lib/vault-crypto";

// Small Argon2id settings so the tests are fast. The app uses KDF (3 passes, 64 MiB).
const FAST = { opsLimit: 1, memLimit: 8 * 1024 * 1024 };
const entry = { title: "Example", username: "user", password: "made-up-secret", url: "", notes: "" };

describe("vault version 2", () => {
  it("opens with the master password and not with another", async () => {
    const { key, settings } = await createVault("correct horse battery staple", FAST);
    expect(settings.wrap_version).toBe(2);
    expect(await unlockVault("wrong horse battery staple", settings)).toBeNull();
    const opened = await unlockVault("correct horse battery staple", settings);
    expect(opened && Buffer.from(opened).equals(Buffer.from(key))).toBe(true);
  });

  it("changes the master password and keeps every entry readable", async () => {
    const { key, settings } = await createVault("old master password here", FAST);
    const sealed = encryptEntry(key, entry);
    const changed: VaultSettingsRow = {
      ...settings,
      ...(await wrapWithPassword(key, "new master password here", FAST)),
    };
    expect(await unlockVault("old master password here", changed)).toBeNull();
    const opened = await unlockVault("new master password here", changed);
    expect(opened && decryptEntry(opened, sealed)).toEqual(entry);
  });
});

describe("a vault from before v1.4.0 (version 1)", () => {
  it("still opens with its password", async () => {
    const { key, settings } = await createVersion1Vault("the old master password", FAST);
    expect(await unlockVault("not the password at all", settings)).toBeNull();
    const opened = await unlockVault("the old master password", settings);
    expect(opened && Buffer.from(opened).equals(Buffer.from(key))).toBe(true);
  });

  it("takes a recovery key while still version 1, and recovery opens it", async () => {
    const { key, settings } = await createVersion1Vault("the old master password", FAST);
    const code = await newRecoveryCode();
    const withRecovery = { ...settings, ...(await wrapWithRecovery(key, code)) };
    expect(await unlockVault("the old master password", withRecovery)).not.toBeNull();
    const opened = await openWithRecovery(code, withRecovery);
    expect(opened && Buffer.from(opened).equals(Buffer.from(key))).toBe(true);
  });

  it("moves to version 2 with the same key, so old entries stay readable", async () => {
    const { key, settings } = await createVersion1Vault("the old master password", FAST);
    const sealed = encryptEntry(key, entry);
    const moved: VaultSettingsRow = { ...settings, ...(await wrapWithPassword(key, "a brand new password", FAST)) };
    expect(moved.wrap_version).toBe(2);
    expect(await unlockVault("the old master password", moved)).toBeNull();
    const opened = await unlockVault("a brand new password", moved);
    expect(opened && decryptEntry(opened, sealed)).toEqual(entry);
  });
});

describe("recovery key", () => {
  it("is 28 characters with no look-alike letters", async () => {
    const code = await newRecoveryCode();
    expect(code).toHaveLength(RECOVERY_LENGTH);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
    expect(formatRecoveryCode(code).split("-")).toHaveLength(7);
  });

  it("reads a code typed with spaces, dashes, lower case, O and I", () => {
    expect(normalizeRecoveryCode("k7qd-9m2x 4trb-h8wa-z3nc-6pfj-v2ke")).toBe("K7QD9M2X4TRBH8WAZ3NC6PFJV2KE");
    expect(normalizeRecoveryCode("O0IL-0000-0000-0000-0000-0000-0000")).toBe("0011000000000000000000000000");
    expect(normalizeRecoveryCode("too short")).toBeNull();
    expect(normalizeRecoveryCode("U".repeat(28))).toBeNull();
  });

  it("opens the vault, and a wrong code does not", async () => {
    const { key, settings } = await createVault("some master password", FAST);
    const code = await newRecoveryCode();
    const withRecovery = { ...settings, ...(await wrapWithRecovery(key, code)) };
    const opened = await openWithRecovery(formatRecoveryCode(code).toLowerCase(), withRecovery);
    expect(opened && isVaultKey(opened, withRecovery)).toBe(true);
    expect(await openWithRecovery(await newRecoveryCode(), withRecovery)).toBeNull();
    expect(await openWithRecovery(code, settings)).toBeNull();
  });
});

describe("PIN", () => {
  it("accepts 6 mixed digits only", () => {
    expect(checkPin("482913")).toBeNull();
    expect(checkPin("12345")).not.toBeNull();
    expect(checkPin("12a456")).not.toBeNull();
    expect(checkPin("777777")).not.toBeNull();
    expect(checkPin("123456")).not.toBeNull();
    expect(checkPin("987654")).not.toBeNull();
  });

  it("opens the key with the right PIN only", async () => {
    const { key, settings } = await createVault("some master password", FAST);
    const locked = await wrapWithPin(key, "482913", FAST);
    expect(await openWithPin("482914", locked, settings, FAST)).toBeNull();
    const opened = await openWithPin("482913", locked, settings, FAST);
    expect(opened && isVaultKey(opened, settings)).toBe(true);
  });
});
