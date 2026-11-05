-- =====================================================================
-- The modules you pinned to Home, so the phone and web match.
-- The app checks the names against lib/modules.ts and skips any it does
-- not know, so a removed module cannot break Home.
-- =====================================================================

alter table public.user_settings
  add column home_shortcuts text[] not null default '{journal,shopping,inventory,vault}';
