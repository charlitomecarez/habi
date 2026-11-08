-- Modules each account switched off in Settings › Modules (v1.4.0 design revision 3).
-- Module ids from lib/modules.ts. user_settings already has apply_owner_rls.
alter table public.user_settings
  add column hidden_modules text[] not null default '{}';
