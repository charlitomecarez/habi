import * as SecureStore from "expo-secure-store";

import type { PinLocked } from "@/lib/vault-crypto";

// PIN unlock for the vault, on this phone only. The vault key, locked with the PIN (Argon2id), sits
// in the Android secure store (encrypted by the Android Keystore). It never goes to Supabase and is
// never logged. After MAX_PIN_TRIES wrong PINs the copy is removed, and the master password is needed.

export const MAX_PIN_TRIES = 5;
export const pinSupported = true;

// SecureStore keys allow letters, digits, ".", "-" and "_" only.
const lockedName = (userId: string) => `vault-pin.${userId}`;
const triesName = (userId: string) => `vault-pin-tries.${userId}`;

export async function readPinLocked(userId: string): Promise<PinLocked | null> {
  const text = await SecureStore.getItemAsync(lockedName(userId));
  if (!text) return null;
  try {
    return JSON.parse(text) as PinLocked;
  } catch {
    await turnOffPin(userId);
    return null;
  }
}

export async function savePinLocked(userId: string, locked: PinLocked): Promise<void> {
  await SecureStore.setItemAsync(lockedName(userId), JSON.stringify(locked));
  await SecureStore.deleteItemAsync(triesName(userId));
}

export async function turnOffPin(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(lockedName(userId));
  await SecureStore.deleteItemAsync(triesName(userId));
}

/** Counts a wrong PIN. Returns the tries left; at 0 the PIN copy is gone. */
export async function noteWrongPin(userId: string): Promise<number> {
  const used = Number((await SecureStore.getItemAsync(triesName(userId))) ?? "0") + 1;
  if (used >= MAX_PIN_TRIES) {
    await turnOffPin(userId);
    return 0;
  }
  await SecureStore.setItemAsync(triesName(userId), String(used));
  return MAX_PIN_TRIES - used;
}

export async function clearWrongPins(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(triesName(userId));
}
