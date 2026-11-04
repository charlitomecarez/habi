import sodium, { loadSumoVersion } from "react-native-libsodium";

// Same build as the vault (lib/vault-crypto.ts); both calls must run before libsodium loads.
loadSumoVersion();

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

export const GENERATED_LENGTH = 20;

/** A random index below `max` with no modulo bias. */
function randomIndex(max: number): number {
  return sodium.randombytes_uniform(max);
}

/**
 * A random password with at least one of each character kind. It leaves out
 * look-alike characters (l, I, O, 0, 1) so it can be typed from the screen.
 */
export async function generatePassword(length = GENERATED_LENGTH): Promise<string> {
  await sodium.ready;
  const chars = [LOWER, UPPER, DIGITS, SYMBOLS].map((set) => set[randomIndex(set.length)]);
  while (chars.length < length) chars.push(ALL[randomIndex(ALL.length)]);
  // Fisher–Yates, so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export type Strength = { score: 0 | 1 | 2 | 3 | 4; label: "Very weak" | "Weak" | "Fair" | "Good" | "Strong" };

/** A rough score from length and the kinds of characters used. */
export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "Very weak" };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (kinds >= 3) score += 1;
  if (kinds <= 1) score -= 1;
  const clamped = Math.max(0, Math.min(4, score)) as Strength["score"];
  const labels: Strength["label"][] = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}
