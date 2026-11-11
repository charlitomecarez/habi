import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryClient, runMutation, runQuery } from "@/lib/test/fake-query";
import { argsOf, resetSupabase, respond, targets } from "@/lib/test/fake-supabase";
import {
  checkRecoveryEmail,
  checkRecoveryKey,
  lockVault,
  makeRecoveryCode,
  sendRecoveryEmail,
  useBiometricUnlock,
  useChangeMasterPassword,
  useDeleteVaultEntry,
  useExportBackup,
  useFinishRecovery,
  usePinUnlock,
  useRestoreBackup,
  useSaveRecoveryKey,
  useSaveVaultEntry,
  useSetBiometricUnlock,
  useSetPin,
  useSetUpVault,
  useUnlockVault,
  useUnlockWithFingerprint,
  useUnlockWithPin,
  useVaultEntries,
  useVaultEntry,
  useVaultSettings,
  useVaultStore,
} from "@/lib/vault";
import type { VaultSettingsRow } from "@/lib/vault-crypto";

vi.mock("@/lib/supabase", () => import("@/lib/test/fake-supabase"));
vi.mock("@tanstack/react-query", () => import("@/lib/test/fake-query"));
vi.mock("react", () => import("@/lib/test/fake-react"));
vi.mock("react-native", () => ({ AppState: { addEventListener: vi.fn() } }));

const KEY = new Uint8Array([1, 2, 3]);
const crypto = vi.hoisted(() => ({
  unlockVault: vi.fn(),
  isVaultKey: vi.fn(() => true),
  openWithPin: vi.fn(),
  openWithRecovery: vi.fn(async () => null),
}));
vi.mock("@/lib/vault-crypto", () => ({
  ENTRY_VERSION: 1,
  VAULT_SETTINGS_COLUMNS: "kdf",
  createVault: vi.fn(async () => ({ key: new Uint8Array([1, 2, 3]), settings: { kdf: "argon2id" } })),
  decryptEntry: vi.fn((_k: unknown, row: { ciphertext: string }) => ({ title: row.ciphertext })),
  encryptEntry: vi.fn(() => ({ ciphertext: "c", nonce: "n" })),
  keyFromBase64: vi.fn(() => new Uint8Array([1, 2, 3])),
  keyToBase64: vi.fn(() => "AQID"),
  newRecoveryCode: vi.fn(async () => "ABCD-EFGH"),
  wrapWithPassword: vi.fn(async () => ({ wrapped: "p" })),
  wrapWithPin: vi.fn(async () => ({ wrapped: "pin" })),
  wrapWithRecovery: vi.fn(async () => ({ recovery: "r" })),
  ...crypto,
}));
const pin = vi.hoisted(() => ({
  readPinLocked: vi.fn(async () => null as unknown),
  noteWrongPin: vi.fn(async () => 2),
  clearWrongPins: vi.fn(async () => {}),
  savePinLocked: vi.fn(async () => {}),
  turnOffPin: vi.fn(async () => {}),
}));
vi.mock("@/lib/vault-pin", () => ({ MAX_PIN_TRIES: 5, pinSupported: true, ...pin }));
vi.mock("@/lib/vault-backup", () => ({ saveBackupFile: vi.fn(async () => {}) }));
const bio = vi.hoisted(() => ({
  biometricMode: vi.fn(async () => "fingerprint" as string | null),
  biometricOptions: vi.fn(async () => ({ fingerprint: true, face: false })),
  readBiometricKey: vi.fn(async () => "AQID" as string | null),
  turnOffBiometricUnlock: vi.fn(async () => {}),
  turnOnBiometricUnlock: vi.fn(async () => {}),
}));
vi.mock("@/lib/vault-biometric", () => bio);

const settings = { kdf: "argon2id" } as unknown as VaultSettingsRow;
const session = { data: { session: { user: { id: "u1", email: "me@example.com" } } } };

beforeEach(() => {
  resetSupabase();
  vi.clearAllMocks();
  lockVault();
});

describe("vault set-up and unlock", () => {
  it("reads the settings row", async () => {
    respond({ data: { kdf: "argon2id" } });
    expect(await runQuery(useVaultSettings())).toEqual({ kdf: "argon2id" });
    respond({ data: null, error: new Error("down") });
    await expect(runQuery(useVaultSettings())).rejects.toThrow("down");
  });

  it("sets up a vault and keeps the key in memory", async () => {
    await runMutation(useSetUpVault(), "secret");
    expect(argsOf("insert")[0][0]).toEqual({ kdf: "argon2id" });
    expect(useVaultStore.getState().key).toEqual(KEY);
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
    respond({ error: new Error("rls") });
    await expect(runMutation(useSetUpVault(), "secret")).rejects.toThrow("rls");
  });

  it("unlocks with the master password, or says it is wrong", async () => {
    crypto.unlockVault.mockResolvedValueOnce(KEY);
    await runMutation(useUnlockVault(), { password: "pw", settings });
    expect(useVaultStore.getState().unlockedWith).toBe("password");
    crypto.unlockVault.mockResolvedValueOnce(null);
    await expect(runMutation(useUnlockVault(), { password: "no", settings })).rejects.toThrow("not right");
  });
});

describe("quick unlock", () => {
  it("reports the device options and the mode", async () => {
    respond(session);
    expect(await runQuery(useBiometricUnlock())).toEqual({
      available: true,
      fingerprint: true,
      face: false,
      mode: "fingerprint",
      on: true,
    });
    respond({ data: { session: null } });
    await expect(runQuery(useBiometricUnlock())).rejects.toThrow("signed out");
  });

  it("unlocks with the fingerprint key", async () => {
    respond(session);
    await runMutation(useUnlockWithFingerprint(), settings);
    expect(useVaultStore.getState().unlockedWith).toBe("fingerprint");
  });

  it("turns quick unlock off when the stored key is stale or missing", async () => {
    crypto.isVaultKey.mockReturnValueOnce(false);
    respond(session);
    await expect(runMutation(useUnlockWithFingerprint(), settings)).rejects.toThrow("no longer opens");
    expect(bio.turnOffBiometricUnlock).toHaveBeenCalledWith("u1");
    bio.readBiometricKey.mockResolvedValueOnce(null);
    respond(session);
    await expect(runMutation(useUnlockWithFingerprint(), settings)).rejects.toThrow("Quick unlock is off");
  });

  it("turns quick unlock on only while unlocked", async () => {
    respond(session);
    await runMutation(useSetBiometricUnlock(), null);
    expect(bio.turnOffBiometricUnlock).toHaveBeenCalled();
    respond(session);
    await expect(runMutation(useSetBiometricUnlock(), "fingerprint")).rejects.toThrow("Unlock the vault first");
    useVaultStore.getState().setKey(KEY);
    respond(session);
    await runMutation(useSetBiometricUnlock(), "face");
    expect(bio.turnOnBiometricUnlock).toHaveBeenCalledWith("u1", "AQID", "face");
  });
});

describe("entries", () => {
  it("is empty while locked, and sorted by title once unlocked", async () => {
    expect(useVaultEntries().entries).toEqual([]);
    respond({ data: [{ id: "1" }] });
    expect(await runQuery(useVaultEntries())).toEqual([{ id: "1" }]);
    respond({ error: new Error("down") });
    await expect(runQuery(useVaultEntries())).rejects.toThrow("down");
    expect(useVaultEntry("1").entry).toBeUndefined();
  });

  it("saves, updates and deletes an entry", async () => {
    await expect(runMutation(useSaveVaultEntry(), { data: { title: "x" } })).rejects.toThrow("locked");
    useVaultStore.getState().setKey(KEY);
    await runMutation(useSaveVaultEntry(), { data: { title: "x" } });
    await runMutation(useSaveVaultEntry(), { id: "e1", data: { title: "y" } });
    await runMutation(useDeleteVaultEntry(), "e1");
    expect(argsOf("insert")[0][0]).toEqual({ ciphertext: "c", nonce: "n", version: 1 });
    expect(targets()).toEqual(["vault_entries", "vault_entries", "vault_entries"]);
    respond({ error: new Error("rls") });
    await expect(runMutation(useDeleteVaultEntry(), "e1")).rejects.toThrow("rls");
    respond({ error: new Error("rls") });
    await expect(runMutation(useSaveVaultEntry(), { data: { title: "x" } })).rejects.toThrow("rls");
  });
});

describe("backups", () => {
  it("exports the encrypted rows", async () => {
    const backup = await import("@/lib/vault-backup");
    respond({ data: { kdf: "argon2id", salt: "s" } }, { data: [] });
    await runMutation(useExportBackup());
    expect(backup.saveBackupFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^my-app-vault-\d{4}-\d\d-\d\d\.json$/),
    );
    respond({ error: new Error("a") }, {});
    await expect(runMutation(useExportBackup())).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runMutation(useExportBackup())).rejects.toThrow("b");
  });

  it("restores into an empty vault only", async () => {
    const backup = { settings: { kdf: "argon2id" }, entries: [{ ciphertext: "c" }] } as never;
    respond({ data: { kdf: "x" } }, { count: 0 });
    await expect(runMutation(useRestoreBackup(), { backup, password: "pw" })).rejects.toThrow("already has a vault");
    respond({ data: null }, { count: 0 });
    crypto.unlockVault.mockResolvedValueOnce(null);
    await expect(runMutation(useRestoreBackup(), { backup, password: "no" })).rejects.toThrow("does not open");
    respond({ data: null }, { count: 0 });
    crypto.unlockVault.mockResolvedValueOnce(KEY);
    await runMutation(useRestoreBackup(), { backup, password: "pw" });
    expect(useVaultStore.getState().key).toEqual(KEY);
  });

  it("removes restored entries when the settings row fails", async () => {
    const backup = { settings: { kdf: "argon2id" }, entries: [] } as never;
    respond({ data: null }, { count: 0 }, { error: new Error("rls") });
    crypto.unlockVault.mockResolvedValueOnce(KEY);
    await expect(runMutation(useRestoreBackup(), { backup, password: "pw" })).rejects.toThrow("rls");
    expect(argsOf("not")).toEqual([["id", "is", null]]);
    respond({ error: new Error("a") }, {});
    await expect(runMutation(useRestoreBackup(), { backup, password: "pw" })).rejects.toThrow("a");
    respond({}, { error: new Error("b") });
    await expect(runMutation(useRestoreBackup(), { backup, password: "pw" })).rejects.toThrow("b");
    const withEntries = { settings: {}, entries: [{}] } as never;
    respond({ data: null }, { count: 0 }, { error: new Error("c") });
    crypto.unlockVault.mockResolvedValueOnce(KEY);
    await expect(runMutation(useRestoreBackup(), { backup: withEntries, password: "pw" })).rejects.toThrow("c");
  });
});

describe("PIN unlock", () => {
  it("reports whether a PIN is on", async () => {
    respond(session);
    expect(await runQuery(usePinUnlock())).toEqual({ available: true, on: false });
  });

  it("turns the PIN on and off", async () => {
    respond(session);
    await runMutation(useSetPin(), null);
    expect(pin.turnOffPin).toHaveBeenCalledWith("u1");
    respond(session);
    await expect(runMutation(useSetPin(), "1234")).rejects.toThrow("Unlock the vault first");
    useVaultStore.getState().setKey(KEY);
    respond(session);
    await runMutation(useSetPin(), "1234");
    expect(pin.savePinLocked).toHaveBeenCalledWith("u1", { wrapped: "pin" });
  });

  it("counts wrong PINs and unlocks with the right one", async () => {
    respond(session);
    await expect(runMutation(useUnlockWithPin(), { pin: "1", settings })).rejects.toThrow("PIN unlock is off");
    pin.readPinLocked.mockResolvedValue({ wrapped: "pin" });
    crypto.openWithPin.mockResolvedValueOnce(null);
    respond(session);
    await expect(runMutation(useUnlockWithPin(), { pin: "1", settings })).rejects.toThrow("2 tries left");
    pin.noteWrongPin.mockResolvedValueOnce(1);
    crypto.openWithPin.mockResolvedValueOnce(null);
    respond(session);
    await expect(runMutation(useUnlockWithPin(), { pin: "1", settings })).rejects.toThrow("1 try left");
    pin.noteWrongPin.mockResolvedValueOnce(0);
    crypto.openWithPin.mockResolvedValueOnce(null);
    respond(session);
    await expect(runMutation(useUnlockWithPin(), { pin: "1", settings })).rejects.toThrow("wrong 5 times");
    crypto.openWithPin.mockResolvedValueOnce(KEY);
    respond(session);
    await runMutation(useUnlockWithPin(), { pin: "1234", settings });
    expect(pin.clearWrongPins).toHaveBeenCalledWith("u1");
    expect(useVaultStore.getState().unlockedWith).toBe("pin");
    pin.readPinLocked.mockResolvedValue(null);
  });
});

describe("recovery and the master password", () => {
  it("makes and saves a recovery code", async () => {
    expect(await makeRecoveryCode()).toBe("ABCD-EFGH");
    await expect(runMutation(useSaveRecoveryKey(), "ABCD")).rejects.toThrow("locked");
    useVaultStore.getState().setKey(KEY);
    respond(session);
    await runMutation(useSaveRecoveryKey(), "ABCD");
    expect(argsOf("update")[0][0]).toEqual({ recovery: "r" });
    expect(argsOf("eq")).toEqual([["user_id", "u1"]]);
    respond(session, { error: new Error("rls") });
    await expect(runMutation(useSaveRecoveryKey(), "ABCD")).rejects.toThrow("rls");
  });

  it("changes the master password after the current one", async () => {
    crypto.unlockVault.mockResolvedValueOnce(null);
    await expect(runMutation(useChangeMasterPassword(), { current: "a", next: "b", settings })).rejects.toThrow(
      "current master password",
    );
    crypto.unlockVault.mockResolvedValueOnce(KEY);
    respond(session);
    await runMutation(useChangeMasterPassword(), { current: "a", next: "b", settings });
    expect(argsOf("update")[0][0]).toEqual({ wrapped: "p" });
    respond(session, { error: new Error("rls") });
    await expect(runMutation(useFinishRecovery(), { key: KEY, password: "b" })).rejects.toThrow("rls");
    respond(session);
    await runMutation(useFinishRecovery(), { key: KEY, password: "b" });
    expect(useVaultStore.getState().unlockedWith).toBe("recovery");
  });

  it("sends and checks the email code", async () => {
    respond(session);
    expect(await sendRecoveryEmail()).toBe("me@example.com");
    respond({ data: { session: null } });
    await expect(sendRecoveryEmail()).rejects.toThrow("no email");
    respond(session, { error: new Error("rate") });
    await expect(sendRecoveryEmail()).rejects.toThrow("Could not send");
    await checkRecoveryEmail("me@example.com", " 123456 ");
    expect(argsOf("verifyOtp")[0][0]).toEqual({ email: "me@example.com", token: "123456", type: "email" });
    respond({ error: new Error("bad") });
    await expect(checkRecoveryEmail("me@example.com", "1")).rejects.toThrow("not right");
    expect(await checkRecoveryKey("x", settings)).toBeNull();
  });
});
