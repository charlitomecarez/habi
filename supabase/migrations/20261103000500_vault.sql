-- =====================================================================
-- Password vault (client-side encryption)
--
-- The server never sees plaintext or the key. Everything about an entry
-- (title, username, password, URL, notes) is one JSON blob encrypted on
-- the device with XChaCha20-Poly1305; only ciphertext + nonce are stored.
-- =====================================================================

-- KDF parameters so any device can re-derive the vault key from the
-- master password. key_check = a known value encrypted with the key, used
-- to verify the master password before decrypting entries.
create table public.vault_settings (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  kdf              text not null default 'argon2id13',
  kdf_salt         text not null,    -- base64
  kdf_ops_limit    integer not null check (kdf_ops_limit > 0),
  kdf_mem_limit    bigint not null check (kdf_mem_limit > 0),
  key_check        text not null,    -- base64 ciphertext
  key_check_nonce  text not null,    -- base64
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger vault_settings_updated_at before update on public.vault_settings
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.vault_settings');

create table public.vault_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ciphertext  text not null,   -- base64
  nonce       text not null,   -- base64, unique per encryption
  version     smallint not null default 1,  -- encryption format version
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index vault_entries_user_idx on public.vault_entries (user_id);
create trigger vault_entries_updated_at before update on public.vault_entries
  for each row execute function public.set_updated_at();
select public.apply_owner_rls('public.vault_entries');
