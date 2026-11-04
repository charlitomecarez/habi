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
};

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

/** A new vault: random salt, derived key, and the settings row to store. */
export async function createVault(password: string): Promise<{ key: Uint8Array; settings: VaultSettingsRow }> {
  await sodium.ready;
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const key = await deriveKey(password, salt, KDF.opsLimit, KDF.memLimit);
  const check = seal(key, KEY_CHECK);
  return {
    key,
    settings: {
      kdf: KDF.name,
      kdf_salt: b64(salt),
      kdf_ops_limit: KDF.opsLimit,
      kdf_mem_limit: KDF.memLimit,
      key_check: check.ciphertext,
      key_check_nonce: check.nonce,
    },
  };
}

/** The vault key, or null when the master password is wrong. */
export async function unlockVault(password: string, settings: VaultSettingsRow): Promise<Uint8Array | null> {
  if (settings.kdf !== KDF.name) throw new Error(`Unknown key derivation "${settings.kdf}".`);
  const key = await deriveKey(password, unb64(settings.kdf_salt), settings.kdf_ops_limit, settings.kdf_mem_limit);
  return isVaultKey(key, settings) ? key : null;
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
