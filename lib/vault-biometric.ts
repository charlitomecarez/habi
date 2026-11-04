import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

// Quick unlock for the vault, in two modes:
//   "fingerprint": the vault key sits in the Android Keystore behind a strong (Class 3)
//                  biometric. Android itself refuses to release it without the fingerprint.
//   "face":        face or fingerprint. Many phones (the Galaxy A56 included) rate face
//                  unlock as weak (Class 2), which the Keystore does not accept. So the key
//                  is stored encrypted by Android but not biometric-locked, and the face or
//                  fingerprint check is a gate the app enforces. Weaker; you opt in to it.
// The key never leaves the device in either mode, and is never logged.

export type BiometricMode = "fingerprint" | "face";

// SecureStore keys allow letters, digits, ".", "-" and "_" only.
const strongKeyName = (userId: string) => `vault-key.${userId}`;
const weakKeyName = (userId: string) => `vault-key-weak.${userId}`;
const flagName = (userId: string) => `vault-bio.${userId}`;

/** What this device can offer: a strong biometric (fingerprint), and face unlock. */
export async function biometricOptions(): Promise<{ fingerprint: boolean; face: boolean }> {
  const [hardware, level, types] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.getEnrolledLevelAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);
  const fingerprint =
    hardware &&
    level >= LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG &&
    SecureStore.canUseBiometricAuthentication();
  const face =
    hardware &&
    level >= LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK &&
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  return { fingerprint, face };
}

/** Which quick unlock is on, or null. Reading it does not ask for a biometric. */
export async function biometricMode(userId: string): Promise<BiometricMode | null> {
  const flag = await SecureStore.getItemAsync(flagName(userId));
  return flag === "1" ? "fingerprint" : flag === "face" ? "face" : null;
}

async function checkFaceOrFingerprint(prompt: string): Promise<void> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: prompt,
    biometricsSecurityLevel: "weak",
    cancelLabel: "Use master password",
    // No phone PIN fallback: only a biometric opens the vault this way.
    disableDeviceFallback: true,
  });
  if (!result.success) throw new Error("Face or fingerprint not recognised. Use your master password.");
}

/** Saves the vault key for quick unlock in the chosen mode, replacing the other mode. */
export async function turnOnBiometricUnlock(userId: string, keyBase64: string, mode: BiometricMode): Promise<void> {
  await turnOffBiometricUnlock(userId);
  if (mode === "fingerprint") {
    await SecureStore.setItemAsync(strongKeyName(userId), keyBase64, {
      requireAuthentication: true,
      authenticationPrompt: "Turn on fingerprint unlock for the vault",
    });
    await SecureStore.setItemAsync(flagName(userId), "1");
    return;
  }
  await checkFaceOrFingerprint("Turn on face or fingerprint unlock for the vault");
  await SecureStore.setItemAsync(weakKeyName(userId), keyBase64);
  await SecureStore.setItemAsync(flagName(userId), "face");
}

export async function turnOffBiometricUnlock(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(strongKeyName(userId));
  await SecureStore.deleteItemAsync(weakKeyName(userId));
  await SecureStore.deleteItemAsync(flagName(userId));
}

/**
 * Asks for the biometric and returns the stored vault key. Throws when you cancel or it
 * fails. When no biometric is enrolled any more, it also turns quick unlock off.
 */
export async function readBiometricKey(userId: string): Promise<string | null> {
  const mode = await biometricMode(userId);
  try {
    if (mode === "fingerprint") {
      return await SecureStore.getItemAsync(strongKeyName(userId), {
        requireAuthentication: true,
        authenticationPrompt: "Unlock the vault",
      });
    }
    if (mode === "face") {
      await checkFaceOrFingerprint("Unlock the vault");
      return await SecureStore.getItemAsync(weakKeyName(userId));
    }
    return null;
  } catch (error) {
    if (!(await LocalAuthentication.isEnrolledAsync())) await turnOffBiometricUnlock(userId);
    throw error;
  }
}
