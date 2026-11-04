# Vault

**Files:** `lib/vault-crypto.ts`, `lib/vault.ts`, `lib/vault-biometric.ts` (+ `.web.ts`), `lib/clipboard.ts` (+ `.web.ts`), `lib/password.ts`, `app/(app)/vault/`, `components/vault/`, migration `...0500_vault.sql`.

## Security rules

- The phone encrypts every entry before it goes to Supabase.
- Supabase gets only ciphertext, nonce, KDF settings and a key check.
- Never send the master password, the key or plaintext to Supabase. Never log them.
- Nobody can reset a forgotten master password.

## Crypto (`lib/vault-crypto.ts`)

- **Key derivation:** Argon2id (`crypto_pwhash`), 3 passes over 64 MiB, with a random salt. `vault_settings` stores the values, so a later change applies only to a new vault.
- **Encryption:** XChaCha20-Poly1305 with a new random nonce for each save.
- **Entry content:** title, username, password, URL and notes are one JSON object, encrypted as one blob.
- **Key check:** `vault_settings.key_check` is a known text encrypted with the key. `unlockVault` decrypts it to prove the master password before it opens any entry.
- **Version:** `vault_entries.version` is `ENTRY_VERSION` (1). An entry with another version shows as unreadable.
- **Web:** the file calls `loadSumoVersion()`, because `crypto_pwhash` is only in the sumo build.

## State (`lib/vault.ts`)

- The key lives only in memory, in the zustand store `useVaultStore` (`key`, `unlockedWith`).
- `lockVault()` sets the key to null. Sign-out calls it.
- Auto-lock: the vault locks when the app was in the background for 5 minutes (`AUTO_LOCK_MINUTES`).
- `useVaultEntries` loads the rows and decrypts them in a `useMemo` with the key. It loads nothing while locked. It sorts by title.

## Flows

1. **Set up** (`SetUpVault`): the master password needs 12 or more characters and a match in the confirm field. `useSetUpVault` creates the salt, key and key check, inserts `vault_settings` and unlocks.
2. **Unlock** (`UnlockVault`): `useUnlockVault` derives the key and checks it. A wrong password shows "That master password is not right."
3. **Fingerprint unlock** (Android only):
   - Turn on: the switch on the vault screen stores the key in SecureStore with `requireAuthentication` (Android Keystore).
   - Unlock: `useUnlockWithFingerprint` reads the key behind a fingerprint prompt and checks it with `isVaultKey`. If the key no longer opens the vault, it turns fingerprint unlock off.
   - On web, the adapter reports that fingerprint unlock is not available.
4. **Save an entry:** `useSaveVaultEntry` encrypts with the in-memory key and inserts or updates the row. If the vault locked, it fails with a message.

## Clipboard

The copy button calls `copySecret(password, 30 s)`.

- **Native:** it clears the clipboard after 30 seconds, but only if it still holds that password.
- **Web:** it clears without a check, because reading the clipboard needs permission.

## Password generator (`lib/password.ts`)

- `generatePassword(20)` uses `sodium.randombytes_uniform`. It puts in at least one lowercase letter, uppercase letter, digit and symbol, then shuffles with Fisher–Yates. It leaves out characters that look alike (l, I, O, 0, 1).
- `passwordStrength` gives a score from 0 to 4 with a word: Very weak, Weak, Fair, Good, Strong. `EntryForm` shows it as four bars and the word.
