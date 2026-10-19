-- Exactly one trusted account. Only service-role provisioning may change it.
create table public.admin_identity (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete restrict
);
alter table public.admin_identity enable row level security;
revoke all on public.admin_identity from anon, authenticated;
grant select on public.admin_identity to anon, authenticated;
create policy admin_reads_identity on public.admin_identity for select
  to authenticated using (user_id = (select auth.uid()));

-- Future private table/storage policies call this helper, never just check authenticated.
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_identity where user_id = (select auth.uid())) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
