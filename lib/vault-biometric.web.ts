// Web has no fingerprint unlock. The vault asks for the master password every session.

export async function canUseBiometrics(): Promise<boolean> {
  return false;
}

export async function isBiometricUnlockOn(_userId: string): Promise<boolean> {
  return false;
}

export async function turnOnBiometricUnlock(_userId: string, _keyBase64: string): Promise<void> {
  throw new Error("Fingerprint unlock is not available on the web.");
}

export async function turnOffBiometricUnlock(_userId: string): Promise<void> {}

export async function readBiometricKey(_userId: string): Promise<string | null> {
  return null;
}
