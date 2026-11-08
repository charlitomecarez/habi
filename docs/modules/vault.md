# Vault

**Files:** `lib/vault-crypto.ts`, `lib/vault.ts`, `lib/vault-biometric.ts` (+ `.web.ts`), `lib/clipboard.ts` (+ `.web.ts`), `lib/password.ts`, `lib/master-password.ts`, `lib/vault-backup.ts` (+ `.web.ts`), `lib/vault-backup-file.ts`, `lib/secure-screen.ts` (+ `.web.ts`), `modules/secure-clipboard/`, `app/(app)/vault/`, `components/vault/`, migration `...0500_vault.sql`.

## Security rules

- The phone encrypts every entry before it goes to Supabase.
- Supabase gets only ciphertext, nonce, KDF settings and a key check.
- Never send the master password, the key or plaintext to Supabase. Never log them.
- Nobody, the server included, can reset a forgotten master password. Only a recovery key that you wrote down can reopen the vault.

## Crypto (`lib/vault-crypto.ts`)

- **Key derivation:** Argon2id (`crypto_pwhash`), 3 passes over 64 MiB, with a random salt. `vault_settings` stores the values, so a later change applies only to a new vault.
- **Encryption:** XChaCha20-Poly1305 with a new random nonce for each save.
- **Entry content:** title, username, password, URL and notes are one JSON object, encrypted as one blob.
- **Key check:** `vault_settings.key_check` is a known text encrypted with the key. `unlockVault` decrypts it to prove the master password before it opens any entry.
- **Version:** `vault_entries.version` is `ENTRY_VERSION` (1). An entry with another version shows as unreadable.
- **Web:** the file calls `loadSumoVersion()`, because `crypto_pwhash` is only in the sumo build.

## Key wrapping (v1.4.0)

- **Version 1** (vaults made before v1.4.0): the vault key is the key derived from the master password.
- **Version 2**: the vault key is random, and `vault_settings.pw_wrap` holds it sealed with the key derived from the master password (Argon2id, `kdf_salt`). New vaults are version 2. A version 1 vault moves to version 2 the first time its master password changes or is recovered. The vault key never changes, so no entry or photo is encrypted again.
- **Recovery key:** 28 Crockford base32 characters (140 bits), shown once in 7 groups, with no copy button. `recovery_wrap` holds the vault key sealed with BLAKE2b(code, `recovery_salt`). A slow hash is not needed at 140 bits. A version 1 vault can have one too. Making a new one replaces the old.
- **Forgot master password** (`/vault/recover`): a code to the sign-in email (`signInWithOtp`, `shouldCreateUser: false`) proves the account, the recovery key opens the vault, and a new master password is saved. The email code alone opens nothing.
- **Change master password** (`/vault/change-password`): proves the current password, then seals the same key with the new one. Fingerprint, PIN and recovery key keep working.
- **PIN unlock** (Android, `lib/vault-pin.ts`): 6 digits (`checkPin` refuses one digit 6 times and straight runs). The vault key sealed with an Argon2id key from the PIN sits in SecureStore. 5 wrong PINs remove it. It never goes to Supabase. The web keeps the master password.
- **Installed APK:** v1.3.0 opens only version 1. Do not change or recover the master password until the v1.4.0 APK is installed, or v1.3.0 will refuse the password (its fingerprint unlock still works). Saving a recovery key is safe.
- Tests: `lib/vault-crypto.test.ts` proves that version 1 still opens, takes a recovery key and moves to version 2 with entries readable, and that PIN and recovery keys open only with the right input.

## State (`lib/vault.ts`)

- The key lives only in memory, in the zustand store `useVaultStore` (`key`, `unlockedWith`).
- `lockVault()` sets the key to null. Sign-out calls it.
- Auto-lock: the vault locks after 1 minute in the background (`AUTO_LOCK_MINUTES`), and after 2 minutes with no touch or typing while the app is open (`IDLE_LOCK_MINUTES`). `app/(app)/_layout.tsx` sees every touch, and `EntryForm` counts typing. A touch inside a bottom sheet does not count, because a `Modal` is outside that view.
- `useVaultEntries` loads the rows and decrypts them in a `useMemo` with the key. It loads nothing while locked. It sorts by title.

## Flows

1. **Set up** (`SetUpVault`): `checkMasterPassword` needs 16 or more characters and refuses common passwords. "Suggest a passphrase" gives 6 random words. A vault that already exists keeps its password, because the app cannot change it. `useSetUpVault` creates the salt, key and key check, inserts `vault_settings` and unlocks.
2. **Unlock** (`UnlockVault`): `useUnlockVault` derives the key and checks it. A wrong password shows "That master password is not right."
3. **Fingerprint unlock** (Android only):
   - Turn on: the switch on the vault screen stores the key in SecureStore with `requireAuthentication` (Android Keystore).
   - Unlock: `useUnlockWithFingerprint` reads the key behind a fingerprint prompt and checks it with `isVaultKey`. If the key no longer opens the vault, it turns fingerprint unlock off.
   - On web, the adapter reports that fingerprint unlock is not available.
4. **Save an entry:** `useSaveVaultEntry` encrypts with the in-memory key and inserts or updates the row. If the vault locked, it fails with a message.

## Clipboard

The copy button calls `copySecret(password, 30 s)`. `modules/secure-clipboard/` marks the text as sensitive, and an exact alarm clears the clipboard, because Android freezes a background app and a timer stops. Android stops background apps from reading the clipboard, so it clears without a check. If you copy something else within the 30 seconds, that clears too. The sensitive mark only asks a keyboard not to keep the text. Web uses a timer.

## Screen block

`useSecureScreen` blocks screenshots, screen recording and the recent apps preview on the vault screens, and in `SecurePhotos` while decrypted photos show. Web does nothing.

## Backup

- "Export backup" saves `vault_settings` and `vault_entries` as Supabase stores them, so the file holds nothing readable. The app has no plain text export on purpose.
- "Restore backup" shows on an empty vault only. `useRestoreBackup` refuses an account that has a vault, and checks the master password with `unlockVault` before it writes any row. Entries have no data tied to an account, so a backup opens in another account.
- The file does not hold the encrypted photos from Documents and Health.
- The backup protects against a lost Supabase project. Version 2 files also hold `pw_wrap` and the recovery copy, so a restore opens with the current master password. Version 1 files still restore.

- **Native:** it clears the clipboard after 30 seconds, but only if it still holds that password.
- **Web:** it clears without a check, because reading the clipboard needs permission.

## Password generator (`lib/password.ts`)

- `generatePassword(20)` uses `sodium.randombytes_uniform`. It puts in at least one lowercase letter, uppercase letter, digit and symbol, then shuffles with Fisher–Yates. It leaves out characters that look alike (l, I, O, 0, 1).
- `passwordStrength` gives a score from 0 to 4 with a word: Very weak, Weak, Fair, Good, Strong. `EntryForm` shows it as four bars and the word.
