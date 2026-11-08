import type { PinLocked } from "@/lib/vault-crypto";

// The web has no secure store, so PIN unlock is not offered there. The master password works.

export const MAX_PIN_TRIES = 5;
export const pinSupported = false;

export async function readPinLocked(_userId: string): Promise<PinLocked | null> {
  return null;
}

export async function savePinLocked(_userId: string, _locked: PinLocked): Promise<void> {
  throw new Error("PIN unlock is only on the Android app.");
}

export async function turnOffPin(_userId: string): Promise<void> {}

export async function noteWrongPin(_userId: string): Promise<number> {
  return 0;
}

export async function clearWrongPins(_userId: string): Promise<void> {}
