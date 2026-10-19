create table public.offer_notes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  body text not null check (length(regexp_replace(body, '^[[:space:] ]+|[[:space:] ]+$', '', 'g')) > 0),
  version bigint not null default 1 check (version > 0),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index offer_notes_offer_timeline on public.offer_notes(offer_id, created_at, id);
alter table public.offer_notes enable row level security;
revoke all on public.offer_notes from anon, authenticated;
grant select on public.offer_notes to anon, authenticated;
create policy admin_reads_offer_notes on public.offer_notes for select to authenticated
using ((select public.is_admin()));
create function public.create_offer_note(p_offer_id uuid, p_body text) returns public.offer_notes
language plpgsql security definer set search_path = '' as $$
declare result public.offer_notes; stamp timestamptz := clock_timestamp();
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  insert into public.offer_notes (offer_id, body, created_at, updated_at)
  values (p_offer_id, regexp_replace(p_body, '^[[:space:] ]+|[[:space:] ]+$', '', 'g'), stamp, stamp)
  returning * into result;
  return result;
end $$;
revoke all on function public.create_offer_note(uuid,text) from public;
grant execute on function public.create_offer_note(uuid,text) to authenticated;
notify pgrst, 'reload schema';
create function public.edit_offer_note(p_id uuid, p_body text, p_expected_version bigint) returns public.offer_notes
language plpgsql security definer set search_path = '' as $$
declare result public.offer_notes;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  update public.offer_notes set body = regexp_replace(p_body, '^[[:space:] ]+|[[:space:] ]+$', '', 'g'), version = version + 1, updated_at = clock_timestamp()
  where id = p_id and version = p_expected_version returning * into result;
  if not found then raise exception 'Note changed or unavailable' using errcode = '40001'; end if;
  return result;
end $$;
create function public.delete_offer_note(p_id uuid, p_expected_version bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  delete from public.offer_notes where id = p_id and version = p_expected_version;
  if not found then raise exception 'Note changed or unavailable' using errcode = '40001'; end if;
end $$;
revoke all on function public.edit_offer_note(uuid,text,bigint) from public;
revoke all on function public.delete_offer_note(uuid,bigint) from public;
grant execute on function public.edit_offer_note(uuid,text,bigint) to authenticated;
grant execute on function public.delete_offer_note(uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
