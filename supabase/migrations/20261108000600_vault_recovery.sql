-- Vault key wrapping, version 2 (v1.4.0 design revision 4). Every new column holds ciphertext,
-- a nonce or a salt, never a key or a password. The PIN never reaches the server.
--   wrap_version 1: the vault key is derived from the master password (vaults before v1.4.0).
--   wrap_version 2: the vault key is stored locked with the master password (pw_wrap), so the
--                   password can change and a recovery key can reopen the vault.
alter table public.vault_settings
  add column wrap_version        smallint not null default 1 check (wrap_version in (1, 2)),
  add column pw_wrap             text,
  add column pw_wrap_nonce       text,
  add column recovery_salt       text,
  add column recovery_wrap       text,
  add column recovery_wrap_nonce text;

alter table public.vault_settings
  add constraint vault_settings_pw_wrap_check
    check (wrap_version = 1 or (pw_wrap is not null and pw_wrap_nonce is not null)),
  add constraint vault_settings_recovery_check
    check (
      (recovery_salt is null and recovery_wrap is null and recovery_wrap_nonce is null)
      or (recovery_salt is not null and recovery_wrap is not null and recovery_wrap_nonce is not null)
    );
