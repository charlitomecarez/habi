import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useMemo } from "react";
import { AppState } from "react-native";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";
import {
  createVault,
  decryptEntry,
  encryptEntry,
  ENTRY_VERSION,
  isVaultKey,
  keyFromBase64,
  keyToBase64,
  unlockVault,
  type VaultEntryData,
  type VaultSettingsRow,
} from "@/lib/vault-crypto";
import { saveBackupFile } from "@/lib/vault-backup";
import { buildBackup, type VaultBackup } from "@/lib/vault-backup-file";
import {
  biometricMode,
  biometricOptions,
  readBiometricKey,
  turnOffBiometricUnlock,
  turnOnBiometricUnlock,
  type BiometricMode,
} from "@/lib/vault-biometric";

export type { VaultEntryData } from "@/lib/vault-crypto";

export type VaultEntry = { id: string; updatedAt: string; data: VaultEntryData | null };

/** The vault locks when the app has been in the background this long. */
export const AUTO_LOCK_MINUTES = 1;
const AUTO_LOCK_MS = AUTO_LOCK_MINUTES * 60 * 1000;
/** The vault locks after this long with no touch or typing while the app is open. */
export const IDLE_LOCK_MINUTES = 2;
const IDLE_LOCK_MS = IDLE_LOCK_MINUTES * 60 * 1000;
const IDLE_CHECK_MS = 10 * 1000;

const SETTINGS_KEY = ["vault-settings"] as const;
const ENTRIES_KEY = ["vault-entries"] as const;
const BIOMETRIC_KEY = ["vault-biometric"] as const;

type VaultState = {
  /** The vault key. Only in memory; null while locked. */
  key: Uint8Array | null;
  /** How the vault was last unlocked, for the "Unlocked with fingerprint" line. */
  unlockedWith: "password" | BiometricMode | null;
  setKey: (key: Uint8Array, unlockedWith?: "password" | BiometricMode) => void;
  lock: () => void;
};

export const useVaultStore = create<VaultState>((set) => ({
  key: null,
  unlockedWith: null,
  setKey: (key, unlockedWith = "password") => {
    noteVaultActivity();
    set({ key, unlockedWith });
  },
  lock: () => set({ key: null, unlockedWith: null }),
}));

export function lockVault() {
  useVaultStore.getState().lock();
}

let backgroundSince: number | null = null;
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    if (backgroundSince !== null && Date.now() - backgroundSince >= AUTO_LOCK_MS) lockVault();
    backgroundSince = null;
  } else if (backgroundSince === null) {
    backgroundSince = Date.now();
  }
});

let lastActivity = Date.now();

/** A touch or a keystroke. The idle lock counts from the last one. */
export function noteVaultActivity() {
  lastActivity = Date.now();
}

// A key in memory is the only state worth a timer, so this does nothing while locked.
setInterval(() => {
  if (useVaultStore.getState().key && Date.now() - lastActivity >= IDLE_LOCK_MS) lockVault();
}, IDLE_CHECK_MS);

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("You are signed out. Sign in again to use the vault.");
  return id;
}

/** The KDF settings row, or null before the vault is set up. */
export function useVaultSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<VaultSettingsRow | null> => {
      const { data, error } = await supabase
        .from("vault_settings")
        .select("kdf, kdf_salt, kdf_ops_limit, kdf_mem_limit, key_check, key_check_nonce")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSetUpVault() {
  const client = useQueryClient();
  const setKey = useVaultStore((s) => s.setKey);
  return useMutation({
    mutationFn: async (password: string) => {
      const { key, settings } = await createVault(password);
      const { error } = await supabase.from("vault_settings").insert(settings);
      if (error) throw error;
      setKey(key);
    },
    onSettled: () => client.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useUnlockVault() {
  const setKey = useVaultStore((s) => s.setKey);
  return useMutation({
    mutationFn: async ({ password, settings }: { password: string; settings: VaultSettingsRow }) => {
      const key = await unlockVault(password, settings);
      if (!key) throw new Error("That master password is not right.");
      setKey(key);
    },
  });
}

export type { BiometricMode };

/** What quick unlock this device offers (fingerprint, face) and which mode is on. */
export function useBiometricUnlock() {
  return useQuery({
    queryKey: BIOMETRIC_KEY,
    queryFn: async () => {
      const options = await biometricOptions();
      const mode = await biometricMode(await currentUserId());
      const available = options.fingerprint || options.face;
      return { available, fingerprint: options.fingerprint, face: options.face, mode, on: available && mode !== null };
    },
  });
}

export function useUnlockWithFingerprint() {
  const setKey = useVaultStore((s) => s.setKey);
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (settings: VaultSettingsRow) => {
      const userId = await currentUserId();
      const mode = await biometricMode(userId);
      const stored = await readBiometricKey(userId);
      if (!stored || !mode) throw new Error("Quick unlock is off. Use your master password.");
      const key = keyFromBase64(stored);
      if (!isVaultKey(key, settings)) {
        await turnOffBiometricUnlock(userId);
        throw new Error("The saved key no longer opens the vault. Use your master password.");
      }
      setKey(key, mode);
    },
    onSettled: () => client.invalidateQueries({ queryKey: BIOMETRIC_KEY }),
  });
}

export function useSetBiometricUnlock() {
  const client = useQueryClient();
  return useMutation({
    /** null turns quick unlock off. */
    mutationFn: async (mode: BiometricMode | null) => {
      const userId = await currentUserId();
      const key = useVaultStore.getState().key;
      if (!mode) return turnOffBiometricUnlock(userId);
      if (!key) throw new Error("Unlock the vault first.");
      await turnOnBiometricUnlock(userId, keyToBase64(key), mode);
    },
    onSettled: () => client.invalidateQueries({ queryKey: BIOMETRIC_KEY }),
  });
}

/** Entries decrypted with the in-memory key. Empty while the vault is locked. */
export function useVaultEntries() {
  const key = useVaultStore((s) => s.key);
  const query = useQuery({
    queryKey: ENTRIES_KEY,
    enabled: key !== null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vault_entries")
        .select("id, ciphertext, nonce, version, updated_at")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const entries = useMemo((): VaultEntry[] => {
    if (!key || !query.data) return [];
    return query.data
      .map((row) => ({
        id: row.id,
        updatedAt: row.updated_at,
        data: row.version === ENTRY_VERSION ? decryptEntry(key, row) : null,
      }))
      .sort((a, b) => (a.data?.title ?? "").localeCompare(b.data?.title ?? ""));
  }, [key, query.data]);

  return { ...query, entries };
}

export function useVaultEntry(id: string) {
  const query = useVaultEntries();
  return { ...query, entry: query.entries.find((e) => e.id === id) };
}

export function useSaveVaultEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: VaultEntryData }) => {
      const key = useVaultStore.getState().key;
      if (!key) throw new Error("The vault locked. Unlock it and try again.");
      const sealed = { ...encryptEntry(key, data), version: ENTRY_VERSION };
      const { error } = id
        ? await supabase.from("vault_entries").update(sealed).eq("id", id)
        : await supabase.from("vault_entries").insert(sealed);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ENTRIES_KEY }),
  });
}

export function useDeleteVaultEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vault_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => client.invalidateQueries({ queryKey: ENTRIES_KEY }),
  });
}

/** Saves the encrypted rows as they are, so the file holds nothing readable. */
export function useExportBackup() {
  return useMutation({
    mutationFn: async () => {
      const [settings, entries] = await Promise.all([
        supabase
          .from("vault_settings")
          .select("kdf, kdf_salt, kdf_ops_limit, kdf_mem_limit, key_check, key_check_nonce")
          .single(),
        supabase.from("vault_entries").select("ciphertext, nonce, version").order("created_at"),
      ]);
      if (settings.error) throw settings.error;
      if (entries.error) throw entries.error;
      const now = new Date();
      await saveBackupFile(
        buildBackup(settings.data, entries.data, now),
        `my-app-vault-${format(now, "yyyy-MM-dd")}.json`,
      );
    },
  });
}

/** Puts a backup into an empty vault. It proves the master password before it writes any row. */
export function useRestoreBackup() {
  const client = useQueryClient();
  const setKey = useVaultStore((s) => s.setKey);
  return useMutation({
    mutationFn: async ({ backup, password }: { backup: VaultBackup; password: string }) => {
      const [settings, entries] = await Promise.all([
        supabase.from("vault_settings").select("kdf").maybeSingle(),
        supabase.from("vault_entries").select("id", { count: "exact", head: true }),
      ]);
      if (settings.error) throw settings.error;
      if (entries.error) throw entries.error;
      if (settings.data || (entries.count ?? 0) > 0) {
        throw new Error("This account already has a vault, so a restore cannot run.");
      }

      const key = await unlockVault(password, backup.settings);
      if (!key) throw new Error("That master password does not open this backup.");

      // Entries first: with no settings row the vault still looks empty if this fails half way.
      if (backup.entries.length > 0) {
        const { error } = await supabase.from("vault_entries").insert(backup.entries);
        if (error) throw error;
      }
      const { error } = await supabase.from("vault_settings").insert(backup.settings);
      if (error) {
        await supabase.from("vault_entries").delete().not("id", "is", null);
        throw error;
      }
      setKey(key);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: SETTINGS_KEY });
      client.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });
}
