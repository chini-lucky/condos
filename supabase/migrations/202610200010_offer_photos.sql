-- Immutable paths and retained tombstones make late uploads reconcilable.
alter table public.offers add column photo_revision bigint not null default 1;
create table public.photo_assets (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.offers(id) on delete set null,
  request_id uuid not null,
  selection_index integer not null check (selection_index >= 0),
  object_key text not null unique,
  position bigint not null check (position >= 0),
  state text not null default 'uploading' check (state in ('uploading','ready','deleting')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  byte_size integer check (byte_size between 1 and 10485760),
  width integer check (width between 1 and 1600),
  height integer check (height between 1 and 1600),
  unique (offer_id, request_id, selection_index),
  check (state <> 'ready' or (offer_id is not null and byte_size is not null and width is not null and height is not null))
);
create index photo_assets_offer on public.photo_assets(offer_id, position);
alter table public.offers add column cover_photo_id uuid references public.photo_assets(id) on delete set null;
create table public.photo_cleanup (
  object_key text primary key,
  attempts integer not null default 0,
  due_at timestamptz not null default now(),
  lease_id uuid,
  lease_until timestamptz,
  last_error text,
  completed_at timestamptz
);
alter table public.photo_assets enable row level security;
alter table public.photo_cleanup enable row level security;
revoke all on public.photo_assets, public.photo_cleanup from anon, authenticated;
grant select on public.photo_assets, public.photo_cleanup to anon, authenticated;
create policy admin_reads_photos on public.photo_assets for select to authenticated using ((select public.is_admin()));
create policy admin_reads_photo_cleanup on public.photo_cleanup for select to authenticated using ((select public.is_admin()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-photos', 'offer-photos', false, 10485760, array['image/jpeg']);
create policy admin_reads_ready_photo_objects on storage.objects for select to authenticated
using (bucket_id = 'offer-photos' and (select public.is_admin()) and exists (
  select 1 from public.photo_assets a where a.object_key = name and a.state = 'ready' and a.offer_id is not null
));

create function public.reserve_photos(p_offer_id uuid, p_count integer, p_request_id uuid)
returns setof public.photo_assets language plpgsql security definer set search_path = '' as $$
declare next_position bigint; existing_count integer;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  if p_count is null or p_count < 1 or p_count > 20 or p_request_id is null then raise exception 'Choose between 1 and 20 photos'; end if;
  perform 1 from public.offers o where o.id = p_offer_id and (to_jsonb(o)->>'trashed_at') is null for update;
  if not found then raise exception 'Offer unavailable'; end if;
  select count(*) into existing_count from public.photo_assets where offer_id = p_offer_id and request_id = p_request_id;
  if existing_count > 0 then
    if existing_count <> p_count then raise exception 'Upload request already used with a different count'; end if;
    return query select * from public.photo_assets where offer_id = p_offer_id and request_id = p_request_id order by selection_index;
    return;
  end if;
  if (select count(*) from public.photo_assets where offer_id = p_offer_id and state in ('uploading','ready')) + p_count > 20 then
    raise exception 'An offer can have at most 20 photos';
  end if;
  select coalesce(max(position) + 1, 0) into next_position from public.photo_assets where offer_id = p_offer_id;
  return query insert into public.photo_assets (id, offer_id, request_id, selection_index, object_key, position)
    select photo_id, p_offer_id, p_request_id, i, p_offer_id::text || '/' || photo_id::text || '.jpg', next_position + i
    from (select i, gen_random_uuid() photo_id from generate_series(0, p_count - 1) i) ids returning *;
end $$;

create function public.cancel_photos(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  -- Match the offer-first lock order used by finalization and offer deletion.
  perform 1 from public.offers where id in (select offer_id from public.photo_assets where id = any(p_ids)) order by id for update;
  with cancelled as (
    update public.photo_assets set state = 'deleting' where id = any(p_ids) and state = 'uploading' returning object_key
  ) insert into public.photo_cleanup(object_key) select object_key from cancelled
    on conflict (object_key) do update set completed_at = null, due_at = now();
end $$;

-- Read a reservation only through the caller's admin JWT; service writes use its exact immutable key.
create function public.photo_upload_target(p_id uuid) returns public.photo_assets
language plpgsql security definer set search_path = '' as $$
declare result public.photo_assets;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  select a.* into result from public.photo_assets a join public.offers o on o.id = a.offer_id
    where a.id = p_id and a.state in ('uploading','ready') and (a.state = 'ready' or a.expires_at > now())
      and (to_jsonb(o)->>'trashed_at') is null;
  if not found then raise exception 'Upload expired or offer unavailable'; end if;
  return result;
end $$;

create function public.finalize_photo(p_id uuid, p_bytes integer, p_width integer, p_height integer)
returns public.photo_assets language plpgsql security definer set search_path = '' as $$
declare asset public.photo_assets; live boolean;
begin
  select * into asset from public.photo_assets where id = p_id;
  if not found then return null; end if;
  perform 1 from public.offers o where o.id = asset.offer_id and (to_jsonb(o)->>'trashed_at') is null for update;
  live := found;
  select * into asset from public.photo_assets where id = p_id for update;
  if live and asset.state = 'ready' then return asset; end if;
  if not live or asset.state <> 'uploading' or asset.expires_at <= now() then
    update public.photo_assets set state = 'deleting' where id = p_id;
    insert into public.photo_cleanup(object_key) values (asset.object_key)
      on conflict (object_key) do update set completed_at = null, due_at = now();
    return null;
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'offer-photos' and name = asset.object_key) then raise exception 'Photo bytes not stored'; end if;
  update public.photo_assets set state = 'ready', byte_size = p_bytes, width = p_width, height = p_height where id = p_id returning * into asset;
  -- Selection order, rather than completion order, determines the initial cover.
  update public.offers set photo_revision = photo_revision + 1, cover_photo_id = (
    select id from public.photo_assets where offer_id = asset.offer_id and state = 'ready' order by position, id limit 1
  ) where id = asset.offer_id;
  return asset;
end $$;

-- FK SET NULL runs even for a permanent deletion issued by later Trash commands.
create function public.enqueue_detached_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.offer_id is null then
    new.state := 'deleting';
    insert into public.photo_cleanup(object_key) values(new.object_key)
      on conflict (object_key) do update set completed_at = null, due_at = now();
  end if;
  return new;
end $$;
create trigger enqueue_detached_photo before update of offer_id on public.photo_assets for each row execute function public.enqueue_detached_photo();

create function public.claim_photo_cleanup(p_limit integer default 20)
returns setof public.photo_cleanup language plpgsql security definer set search_path = '' as $$
begin
  -- Expired reservations release slots. Tombstones outlive successful deletions.
  update public.photo_assets set state = 'deleting' where state = 'uploading' and expires_at <= now();
  insert into public.photo_cleanup(object_key)
    select object_key from public.photo_assets where state = 'deleting'
    on conflict (object_key) do nothing;
  -- Read-only reconciliation of Storage metadata catches a late upload after a completed removal.
  insert into public.photo_cleanup(object_key)
    select o.name from storage.objects o left join public.photo_assets a on a.object_key = o.name
    where o.bucket_id = 'offer-photos' and (a.id is null or a.state = 'deleting')
    on conflict (object_key) do update set completed_at = null;
  return query with jobs as (
    select q.object_key from public.photo_cleanup q
    where q.completed_at is null and q.due_at <= now() and (q.lease_until is null or q.lease_until < now())
      and not exists (select 1 from public.photo_assets a where a.object_key = q.object_key and a.state = 'ready')
    order by q.due_at, q.object_key for update of q skip locked limit least(greatest(p_limit, 1), 100)
  ) update public.photo_cleanup q set lease_id = gen_random_uuid(), lease_until = now() + interval '2 minutes', attempts = attempts + 1
    from jobs where q.object_key = jobs.object_key returning q.*;
end $$;
create function public.finish_photo_cleanup(p_key text, p_lease uuid, p_error text default null) returns void
language sql security definer set search_path = '' as $$
  update public.photo_cleanup set lease_id = null, lease_until = null,
    last_error = left(p_error, 300), completed_at = case when p_error is null then now() else null end,
    due_at = now() + make_interval(secs => least(3600, 5 * power(2, least(attempts, 9)))::integer)
  where object_key = p_key and lease_id = p_lease;
$$;

revoke all on function public.reserve_photos(uuid,integer,uuid), public.cancel_photos(uuid[]), public.photo_upload_target(uuid) from public;
grant execute on function public.reserve_photos(uuid,integer,uuid), public.cancel_photos(uuid[]), public.photo_upload_target(uuid) to authenticated;
revoke all on function public.finalize_photo(uuid,integer,integer,integer), public.claim_photo_cleanup(integer), public.finish_photo_cleanup(text,uuid,text), public.enqueue_detached_photo() from public, anon, authenticated;
grant execute on function public.finalize_photo(uuid,integer,integer,integer), public.claim_photo_cleanup(integer), public.finish_photo_cleanup(text,uuid,text) to service_role;
