-- Read-only. Lists each public table with RLS off or with no policy. It must return no rows.
-- Run: npx supabase db query --linked --file scripts/rls-check.sql
select c.relname as table_name,
       c.relrowsecurity as rls_on,
       count(p.polname) as policies
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_policy p on p.polrelid = c.oid
 where n.nspname = 'public'
   and c.relkind = 'r'
 group by c.relname, c.relrowsecurity
having not c.relrowsecurity or count(p.polname) = 0
 order by 1;
