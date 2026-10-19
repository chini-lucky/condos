create table public.offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and length(name) > 0),
  status text not null default 'Pending' check (status in ('Pending','Available','Viewing','Rejected')),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.offers enable row level security;
revoke all on public.offers from anon, authenticated;
grant select on public.offers to anon, authenticated;
create policy admin_reads_offers on public.offers for select to authenticated
using ((select public.is_admin()));

-- RPCs own writes so callers cannot invent timestamps or bypass concurrency.
create function public.create_offer(p_name text) returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  insert into public.offers (name) values (btrim(p_name)) returning * into result;
  return result;
end $$;
revoke all on function public.create_offer(text) from public;
grant execute on function public.create_offer(text) to authenticated;
