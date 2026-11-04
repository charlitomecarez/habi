import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// SecureStore keys allow letters, digits, ".", "-" and "_" only.
const keyName = (userId: string) => `vault-key.${userId}`;
const flagName = (userId: string) => `vault-bio.${userId}`;

/** True when the device has a fingerprint (or other biometric) enrolled. */
export async function canUseBiometrics(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled && SecureStore.canUseBiometricAuthentication();
}

/** Whether fingerprint unlock is on. Reading the flag does not ask for a fingerprint. */
export async function isBiometricUnlockOn(userId: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(flagName(userId))) === "1";
}

/**
 * Stores the vault key in the Android Keystore behind a fingerprint. The key
 * never leaves the device.
 */
export async function turnOnBiometricUnlock(userId: string, keyBase64: string): Promise<void> {
  await SecureStore.setItemAsync(keyName(userId), keyBase64, {
    requireAuthentication: true,
    authenticationPrompt: "Turn on fingerprint unlock for the vault",
  });
  await SecureStore.setItemAsync(flagName(userId), "1");
}

export async function turnOffBiometricUnlock(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyName(userId));
  await SecureStore.deleteItemAsync(flagName(userId));
}

/**
 * Asks for a fingerprint and returns the stored vault key. Throws when the
 * user cancels or the prompt fails. When no fingerprint is enrolled any more,
 * it also turns fingerprint unlock off.
 */
export async function readBiometricKey(userId: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(keyName(userId), {
      requireAuthentication: true,
      authenticationPrompt: "Unlock the vault",
    });
  } catch (error) {
    if (!(await LocalAuthentication.isEnrolledAsync())) await turnOffBiometricUnlock(userId);
    throw error;
  }
}
