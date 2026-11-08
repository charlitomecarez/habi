import sodium, { loadSumoVersion } from "react-native-libsodium";

// Web: crypto_pwhash is only in the sumo build. Native ignores this call.
loadSumoVersion();

/**
 * Key derivation: Argon2id with 3 passes over 64 MiB. Stronger than
 * libsodium's "interactive" preset, and still about a second on a mid-range
 * phone. The values are stored in vault_settings, so a later change only
 * applies to a vault set up after it.
 */
export const KDF = { name: "argon2id13", opsLimit: 3, memLimit: 64 * 1024 * 1024 } as const;

/** The plaintext of vault_settings.key_check. Decrypting it proves the master password. */
const KEY_CHECK = "my-app vault key check v1";

/** vault_entries.version for this encryption format. */
export const ENTRY_VERSION = 1;

/** What one vault entry holds. The whole object is encrypted as one JSON blob. */
export type VaultEntryData = {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
};

export type VaultSettingsRow = {
  kdf: string;
  kdf_salt: string;
  kdf_ops_limit: number;
  kdf_mem_limit: number;
  key_check: string;
  key_check_nonce: string;
  /**
   * 1: the vault key is the key derived from the master password (vaults made before v1.4.0).
   * 2: the vault key is random-like and stored locked (`pw_wrap`) with the key derived from the
   *    master password, so the password can change without encrypting any entry again.
   */
  wrap_version?: number;
  pw_wrap?: string | null;
  pw_wrap_nonce?: string | null;
  /** The vault key locked with the recovery key. All three set, or all null. */
  recovery_salt?: string | null;
  recovery_wrap?: string | null;
  recovery_wrap_nonce?: string | null;
};

/** The columns this file reads and writes, for selects. */
export const VAULT_SETTINGS_COLUMNS =
  "kdf, kdf_salt, kdf_ops_limit, kdf_mem_limit, key_check, key_check_nonce, wrap_version, pw_wrap, pw_wrap_nonce, recovery_salt, recovery_wrap, recovery_wrap_nonce";

export type KdfParams = { opsLimit: number; memLimit: number };

export type Sealed = { ciphertext: string; nonce: string };

const b64 = (bytes: Uint8Array) => sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
const unb64 = (text: string) => sodium.from_base64(text, sodium.base64_variants.ORIGINAL);

// No additional data. The native AEAD functions throw on null and accept only a
// string; "" gives the same ciphertext as null on web.
const NO_AD = "";

async function deriveKey(password: string, salt: Uint8Array, opsLimit: number, memLimit: number): Promise<Uint8Array> {
  await sodium.ready;
  // On Android the derivation blocks the JS thread for about a second. Wait one frame so the spinner shows first.
  await new Promise((resolve) => setTimeout(resolve, 50));
  return sodium.crypto_pwhash(
    sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    password,
    salt,
    opsLimit,
    memLimit,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  );
}

function seal(key: Uint8Array, plaintext: string): Sealed {
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, NO_AD, null, nonce, key);
  return { ciphertext: b64(ciphertext), nonce: b64(nonce) };
}

/** Null when the key is wrong or the data was changed. */
function open(key: Uint8Array, sealed: Sealed): string | null {
  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      unb64(sealed.ciphertext),
      NO_AD,
      unb64(sealed.nonce),
      key,
    );
    return sodium.to_string(plaintext);
  } catch {
    return null;
  }
}

/**
 * A new vault (version 2): a random vault key, locked with the master password, and the settings
 * row to store. A recovery key is added later, from the vault screen.
 */
export async function createVault(
  password: string,
  params: KdfParams = KDF,
): Promise<{ key: Uint8Array; settings: VaultSettingsRow }> {
  await sodium.ready;
  const key = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  const check = seal(key, KEY_CHECK);
  return {
    key,
    settings: {
      ...(await wrapWithPassword(key, password, params)),
      key_check: check.ciphertext,
      key_check_nonce: check.nonce,
    },
  };
}

/**
 * A vault in the version 1 format, as the app made it before v1.4.0: the vault key is the key
 * derived from the password. Only tests use it, to prove that old vaults still open and move on.
 */
export async function createVersion1Vault(
  password: string,
  params: KdfParams = KDF,
): Promise<{ key: Uint8Array; settings: VaultSettingsRow }> {
  await sodium.ready;
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const key = await deriveKey(password, salt, params.opsLimit, params.memLimit);
  const check = seal(key, KEY_CHECK);
  return {
    key,
    settings: {
      kdf: KDF.name,
      kdf_salt: b64(salt),
      kdf_ops_limit: params.opsLimit,
      kdf_mem_limit: params.memLimit,
      key_check: check.ciphertext,
      key_check_nonce: check.nonce,
      wrap_version: 1,
    },
  };
}

/** The vault key, or null when the master password is wrong. Opens version 1 and version 2 vaults. */
export async function unlockVault(password: string, settings: VaultSettingsRow): Promise<Uint8Array | null> {
  if (settings.kdf !== KDF.name) throw new Error(`Unknown key derivation "${settings.kdf}".`);
  const derived = await deriveKey(password, unb64(settings.kdf_salt), settings.kdf_ops_limit, settings.kdf_mem_limit);
  if ((settings.wrap_version ?? 1) === 1) return isVaultKey(derived, settings) ? derived : null;
  if (!settings.pw_wrap || !settings.pw_wrap_nonce) return null;
  const key = openKey(derived, { ciphertext: settings.pw_wrap, nonce: settings.pw_wrap_nonce });
  return key && isVaultKey(key, settings) ? key : null;
}

// A key is sealed as its base64 text, with the same AEAD as the entries.
const sealKey = (lock: Uint8Array, key: Uint8Array): Sealed => seal(lock, b64(key));
function openKey(lock: Uint8Array, sealed: Sealed): Uint8Array | null {
  const text = open(lock, sealed);
  if (text === null) return null;
  try {
    return unb64(text);
  } catch {
    return null;
  }
}

/**
 * Locks the vault key with a new master password (new salt). The result is the change to
 * vault_settings: the vault becomes version 2, and every entry stays as it is.
 */
export async function wrapWithPassword(
  key: Uint8Array,
  password: string,
  params: KdfParams = KDF,
): Promise<
  Pick<
    VaultSettingsRow,
    "kdf" | "kdf_salt" | "kdf_ops_limit" | "kdf_mem_limit" | "wrap_version" | "pw_wrap" | "pw_wrap_nonce"
  >
> {
  await sodium.ready;
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const lock = await deriveKey(password, salt, params.opsLimit, params.memLimit);
  const sealed = sealKey(lock, key);
  return {
    kdf: KDF.name,
    kdf_salt: b64(salt),
    kdf_ops_limit: params.opsLimit,
    kdf_mem_limit: params.memLimit,
    wrap_version: 2,
    pw_wrap: sealed.ciphertext,
    pw_wrap_nonce: sealed.nonce,
  };
}

// ---- Recovery key -------------------------------------------------------------------------------
// 28 characters of Crockford base32 (no I, L, O or U), 5 bits each: 140 random bits. That is far
// beyond guessing, so a fast hash with a random salt is enough to turn it into a lock.

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const RECOVERY_LENGTH = 28;

/** A new recovery code, as 28 characters with no dashes. Show it with formatRecoveryCode. */
export async function newRecoveryCode(): Promise<string> {
  await sodium.ready;
  return Array.from({ length: RECOVERY_LENGTH }, () => CROCKFORD[sodium.randombytes_uniform(32)]).join("");
}

/** "K7QD-9M2X-…": groups of 4, so it is easy to write down and type. */
export function formatRecoveryCode(code: string): string {
  return (code.match(/.{1,4}/g) ?? []).join("-");
}

/** The code as typed, cleaned: spaces and dashes go, O reads as 0 and I or L as 1. Null when it cannot be a code. */
export function normalizeRecoveryCode(typed: string): string | null {
  const code = typed.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return code.length === RECOVERY_LENGTH && [...code].every((c) => CROCKFORD.includes(c)) ? code : null;
}

async function recoveryLock(code: string, salt: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;
  return sodium.crypto_generichash(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES, code, salt);
}

/** Locks the vault key with a recovery code. The result is the change to vault_settings. */
export async function wrapWithRecovery(
  key: Uint8Array,
  code: string,
): Promise<Pick<VaultSettingsRow, "recovery_salt" | "recovery_wrap" | "recovery_wrap_nonce">> {
  await sodium.ready;
  const salt = sodium.randombytes_buf(32);
  const sealed = sealKey(await recoveryLock(code, salt), key);
  return { recovery_salt: b64(salt), recovery_wrap: sealed.ciphertext, recovery_wrap_nonce: sealed.nonce };
}

/** The vault key from a typed recovery code, or null when the code is wrong or none is set. */
export async function openWithRecovery(typed: string, settings: VaultSettingsRow): Promise<Uint8Array | null> {
  const code = normalizeRecoveryCode(typed);
  if (!code || !settings.recovery_salt || !settings.recovery_wrap || !settings.recovery_wrap_nonce) return null;
  const lock = await recoveryLock(code, unb64(settings.recovery_salt));
  const key = openKey(lock, { ciphertext: settings.recovery_wrap, nonce: settings.recovery_wrap_nonce });
  return key && isVaultKey(key, settings) ? key : null;
}

// ---- PIN (this phone only) ----------------------------------------------------------------------
// The PIN locks a copy of the vault key that stays in the Android secure store. It never goes to
// Supabase. Argon2id slows a guess, and lib/vault-pin.ts removes the copy after 5 wrong PINs.

export type PinLocked = { salt: string; ciphertext: string; nonce: string };

/** 6 digits, not all the same, and not a straight run such as 123456. Null when fine, or the problem. */
export function checkPin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return "Use exactly 6 digits.";
  if (/^(\d)\1{5}$/.test(pin)) return "Use different digits, not one digit 6 times.";
  const digits = [...pin].map(Number);
  const step = digits[1] - digits[0];
  if (Math.abs(step) === 1 && digits.every((d, i) => i === 0 || d - digits[i - 1] === step)) {
    return "Use a PIN that is not a straight run, such as 123456.";
  }
  return null;
}

export async function wrapWithPin(key: Uint8Array, pin: string, params: KdfParams = KDF): Promise<PinLocked> {
  await sodium.ready;
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const lock = await deriveKey(pin, salt, params.opsLimit, params.memLimit);
  return { salt: b64(salt), ...sealKey(lock, key) };
}

/** The vault key, or null when the PIN is wrong. */
export async function openWithPin(
  pin: string,
  locked: PinLocked,
  settings: VaultSettingsRow,
  params: KdfParams = KDF,
): Promise<Uint8Array | null> {
  const lock = await deriveKey(pin, unb64(locked.salt), params.opsLimit, params.memLimit);
  const key = openKey(lock, locked);
  return key && isVaultKey(key, settings) ? key : null;
}

/** True when `key` opens this vault, e.g. a key read back from the fingerprint store. */
export function isVaultKey(key: Uint8Array, settings: VaultSettingsRow): boolean {
  return open(key, { ciphertext: settings.key_check, nonce: settings.key_check_nonce }) === KEY_CHECK;
}

export function encryptEntry(key: Uint8Array, entry: VaultEntryData): Sealed {
  return seal(key, JSON.stringify(entry));
}

/** Null when the entry cannot be decrypted with this key. */
export function decryptEntry(key: Uint8Array, sealed: Sealed): VaultEntryData | null {
  const json = open(key, sealed);
  if (json === null) return null;
  const value = JSON.parse(json) as Partial<VaultEntryData>;
  return {
    title: value.title ?? "",
    username: value.username ?? "",
    password: value.password ?? "",
    url: value.url ?? "",
    notes: value.notes ?? "",
  };
}

export function keyToBase64(key: Uint8Array): string {
  return b64(key);
}

export function keyFromBase64(text: string): Uint8Array {
  return unb64(text);
}

/**
 * Encrypts file bytes (a photo) with the vault key. The result is nonce || ciphertext,
 * ready to upload as one file. Used for document and lab result photos.
 */
export async function encryptBytes(key: Uint8Array, bytes: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(bytes, NO_AD, null, nonce, key);
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce, 0);
  out.set(ciphertext, nonce.length);
  return out;
}

/** The photo bytes as base64, or null when the key is wrong or the file was changed. */
export async function decryptBytesToBase64(key: Uint8Array, data: Uint8Array): Promise<string | null> {
  await sodium.ready;
  const n = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  try {
    const plain = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, data.slice(n), NO_AD, data.slice(0, n), key);
    return b64(plain);
  } catch {
    return null;
  }
}
