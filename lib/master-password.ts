// The rule for a new master password. Pure, so it has tests, and separate from passwordStrength,
// which rates a long lowercase passphrase only Fair.

export const MIN_MASTER_PASSWORD = 16;

/** Common bases. Digits and symbols around them add almost nothing. */
const COMMON_BASES = new Set([
  "password",
  "passwordpassword",
  "passw",
  "qwerty",
  "qwertyuiop",
  "asdfghjkl",
  "zxcvbnm",
  "abc",
  "abcdefghijklmnop",
  "iloveyou",
  "letmein",
  "welcome",
  "admin",
  "administrator",
  "monkey",
  "dragon",
  "master",
  "masterpassword",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "superman",
  "batman",
  "trustno",
  "changeme",
  "secret",
  "mypassword",
  "myapp",
  "mahalkita",
  "pilipinas",
  "philippines",
]);

const onlyLetters = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");

/** A reason to refuse the password, or null when it is fine. */
export function checkMasterPassword(password: string): string | null {
  if (password.length < MIN_MASTER_PASSWORD) return `Use at least ${MIN_MASTER_PASSWORD} characters.`;
  const letters = onlyLetters(password);
  const repeats = /^(.{1,8})\1+$/.test(password.toLowerCase());
  if (letters === "" || COMMON_BASES.has(letters) || repeats) {
    return "That password is too common. Try 5 or 6 random words.";
  }
  return null;
}
