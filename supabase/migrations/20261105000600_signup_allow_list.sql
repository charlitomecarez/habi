-- =====================================================================
-- Sign-in allow list. The app holds money and vault data, so only listed
-- email addresses can create an account. Any other sign-up is refused.
--   allowed_emails  no user_id: nobody owns a row, and the app cannot read
--                   or write it. Add an address in the SQL editor:
--                     insert into public.allowed_emails (email) values ('name@example.com');
-- Existing accounts are copied in below, so addresses stay out of the repo.
-- The check runs only when an account is created, so existing sign-ins keep working.
-- =====================================================================

create table public.allowed_emails (
  email      text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
-- RLS with no policy: the app roles see nothing.
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

insert into public.allowed_emails (email)
select distinct lower(email) from auth.users where email is not null
on conflict (email) do nothing;

create or replace function public.check_allowed_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or not exists (select 1 from allowed_emails where email = lower(new.email)) then
    raise exception 'This account is not on the allow list.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_allowed_email() from public, anon, authenticated;

create trigger before_auth_user_created_allow_list before insert on auth.users
  for each row execute function public.check_allowed_email();
