// Web has no fingerprint or face unlock. The vault asks for the master password every session.

export type BiometricMode = "fingerprint" | "face";

export async function biometricOptions(): Promise<{ fingerprint: boolean; face: boolean }> {
  return { fingerprint: false, face: false };
}

export async function biometricMode(_userId: string): Promise<BiometricMode | null> {
  return null;
}

export async function turnOnBiometricUnlock(_userId: string, _keyBase64: string, _mode: BiometricMode): Promise<void> {
  throw new Error("Quick unlock is not available on the web.");
}

export async function turnOffBiometricUnlock(_userId: string): Promise<void> {}

export async function readBiometricKey(_userId: string): Promise<string | null> {
  return null;
}
