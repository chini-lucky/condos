-- Receipts outlive offers so uncertain responses and byte-cleanup failures remain recoverable.
create table public.offer_deletions (
  offer_id uuid primary key,
  name text not null,
  deleted_at timestamptz not null default clock_timestamp()
);
alter table public.offer_deletions enable row level security;
revoke all on public.offer_deletions from anon, authenticated;
grant select on public.offer_deletions to authenticated;
create policy admin_reads_offer_deletions on public.offer_deletions for select to authenticated using ((select public.is_admin()));
alter table public.photo_cleanup add column deletion_offer_id uuid references public.offer_deletions(offer_id);
create index photo_cleanup_deletion on public.photo_cleanup(deletion_offer_id) where deletion_offer_id is not null;

create function public.list_offer_deletions() returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('offer_id', d.offer_id, 'name', d.name, 'deleted_at', d.deleted_at,
    'pending', count(q.object_key) filter (where q.completed_at is null),
    'failed', count(q.object_key) filter (where q.completed_at is null and q.last_error is not null))
  from public.offer_deletions d left join public.photo_cleanup q on q.deletion_offer_id = d.offer_id
  where public.is_admin() group by d.offer_id order by d.deleted_at desc;
$$;
create function public.permanently_delete_offer(p_id uuid, p_expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target public.offers; receipt jsonb;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  -- Parent first: shared ordering with child mutations, reservations and finalization.
  select * into target from public.offers where id = p_id for update;
  if not found then
    select value into receipt from public.list_offer_deletions() value where value->>'offer_id' = p_id::text;
    if receipt is not null then return receipt; end if;
    raise exception 'Offer changed or is no longer available' using errcode = '40001';
  end if;
  if target.trashed_at is null or target.version is distinct from p_expected_version then
    raise exception 'Offer changed or is not in Trash' using errcode = '40001';
  end if;
  insert into public.offer_deletions(offer_id, name) values(p_id, target.name);
  -- Scope every byte cleanup to its durable receipt before FK detachment.
  insert into public.photo_cleanup(object_key, deletion_offer_id)
    select object_key, p_id from public.photo_assets where offer_id = p_id
    on conflict(object_key) do update set deletion_offer_id = p_id, completed_at = null, due_at = now();
  -- Notes cascade. Asset FK SET NULL queues immutable tombstones; never delete them.
  delete from public.offers where id = p_id;
  select value into receipt from public.list_offer_deletions() value where value->>'offer_id' = p_id::text;
  return receipt;
end $$;
revoke all on function public.list_offer_deletions(), public.permanently_delete_offer(uuid,bigint) from public;
grant execute on function public.list_offer_deletions(), public.permanently_delete_offer(uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
