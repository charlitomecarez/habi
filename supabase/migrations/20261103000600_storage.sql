-- =====================================================================
-- Storage: one private bucket for inventory photos and service receipts.
-- Paths are <user_id>/<module>/<file>, e.g.
--   1f0c.../inventory/<item_id>.jpg
--   1f0c.../receipts/<service_log_id>.jpg
-- Policies allow access only inside your own <user_id>/ folder.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-files', 'user-files', false, 5242880,  -- 5 MB cap per file
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "user_files_select" on storage.objects for select to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "user_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "user_files_update" on storage.objects for update to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "user_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'user-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
