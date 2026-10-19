-- A single statement returns a coherent revision, cover and ordered ready set.
create function public.get_offer_photos(p_offer_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('revision', o.photo_revision, 'cover_id', o.cover_photo_id,
    'photos', coalesce((select jsonb_agg(to_jsonb(a) order by a.position, a.id)
      from public.photo_assets a where a.offer_id = o.id and a.state = 'ready'), '[]'::jsonb))
  from public.offers o where o.id = p_offer_id and public.is_admin();
$$;
-- Shared lock/identity/revision rule; not callable directly by browser identities.
create function public.lock_photo_offer(p_offer_id uuid, p_expected_revision bigint) returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  select * into result from public.offers o where o.id = p_offer_id
    and (to_jsonb(o)->>'trashed_at') is null for update;
  if not found then raise exception 'Offer unavailable or in Trash' using errcode = '40001'; end if;
  if result.photo_revision is distinct from p_expected_revision then
    raise exception 'Photos changed on another device. Review the latest photos before retrying.' using errcode = '40001';
  end if;
  return result;
end $$;
create function public.reorder_photos(p_offer_id uuid, p_expected_revision bigint, p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare position_offset bigint;
begin
  perform public.lock_photo_offer(p_offer_id, p_expected_revision);
  if p_ids is null or cardinality(p_ids) <> (select count(*) from public.photo_assets where offer_id = p_offer_id and state = 'ready')
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) u(id))
    or exists (select 1 from unnest(p_ids) u(id) where not exists
      (select 1 from public.photo_assets a where a.id = u.id and a.offer_id = p_offer_id and a.state = 'ready')) then
    raise exception 'Choose each current photo exactly once';
  end if;
  -- Finish already-reserved uploads after the organized ready set without changing
  -- their relative selection order or immutable keys.
  select coalesce(max(position), -1) + cardinality(p_ids) + 1 into position_offset
    from public.photo_assets where offer_id = p_offer_id;
  update public.photo_assets set position = position + position_offset where offer_id = p_offer_id and state = 'uploading';
  update public.photo_assets a set position = u.position - 1
    from unnest(p_ids) with ordinality u(id, position) where a.id = u.id;
  update public.offers set photo_revision = photo_revision + 1 where id = p_offer_id;
  return public.get_offer_photos(p_offer_id);
end $$;
revoke all on function public.get_offer_photos(uuid), public.lock_photo_offer(uuid,bigint), public.reorder_photos(uuid,bigint,uuid[]) from public;
grant execute on function public.get_offer_photos(uuid), public.reorder_photos(uuid,bigint,uuid[]) to authenticated;
notify pgrst, 'reload schema';

-- A deliberate cover choice remains independent of order and later upload completion.
alter table public.offers add column photo_cover_explicit boolean not null default false;
create function public.choose_photo_cover(p_offer_id uuid, p_expected_revision bigint, p_photo_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.lock_photo_offer(p_offer_id, p_expected_revision);
  if not exists(select 1 from public.photo_assets where id = p_photo_id and offer_id = p_offer_id and state = 'ready') then
    raise exception 'Choose a current photo from this offer';
  end if;
  update public.offers set cover_photo_id = p_photo_id, photo_cover_explicit = true, photo_revision = photo_revision + 1 where id = p_offer_id;
  return public.get_offer_photos(p_offer_id);
end $$;
revoke all on function public.choose_photo_cover(uuid,bigint,uuid) from public;
grant execute on function public.choose_photo_cover(uuid,bigint,uuid) to authenticated;
create or replace function public.finalize_photo(p_id uuid, p_bytes integer, p_width integer, p_height integer)
returns public.photo_assets language plpgsql security definer set search_path = '' as $$
declare asset public.photo_assets; live boolean; parent_exists boolean;
begin
  select * into asset from public.photo_assets where id = p_id;
  if not found then return null; end if;
  select (to_jsonb(o)->>'trashed_at') is null into live from public.offers o where o.id = asset.offer_id for update;
  parent_exists := found;
  live := coalesce(live, false);
  select * into asset from public.photo_assets where id = p_id for update;
  if parent_exists and asset.state = 'ready' then return asset; end if;
  if not live or asset.state <> 'uploading' or asset.expires_at <= now() then
    update public.photo_assets set state = 'deleting' where id = p_id;
    insert into public.photo_cleanup(object_key) values (asset.object_key)
      on conflict (object_key) do update set completed_at = null, due_at = now();
    return null;
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'offer-photos' and name = asset.object_key) then raise exception 'Photo bytes not stored'; end if;
  update public.photo_assets set state = 'ready', byte_size = p_bytes, width = p_width, height = p_height where id = p_id returning * into asset;
  -- Until a deliberate choice, an earlier completing selection can replace the
  -- automatic cover. Reordering and later selections never reset an existing cover.
  update public.offers o set photo_revision = photo_revision + 1, cover_photo_id = case
    when exists(select 1 from public.photo_assets a where a.id = o.cover_photo_id and a.offer_id = asset.offer_id and a.state = 'ready')
      and (o.photo_cover_explicit or (select a.position from public.photo_assets a where a.id = o.cover_photo_id) <= asset.position)
      then o.cover_photo_id
    else (select a.id from public.photo_assets a where a.offer_id = asset.offer_id and a.state = 'ready' order by a.position, a.id limit 1)
    end where o.id = asset.offer_id;
  return asset;
end $$;

notify pgrst, 'reload schema';

create function public.remove_photo(p_offer_id uuid, p_expected_revision bigint, p_photo_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare offer public.offers; removed public.photo_assets; replacement uuid;
begin
  offer := public.lock_photo_offer(p_offer_id, p_expected_revision);
  update public.photo_assets set state = 'deleting'
    where id = p_photo_id and offer_id = p_offer_id and state = 'ready' returning * into removed;
  if not found then raise exception 'Choose a current photo from this offer'; end if;
  insert into public.photo_cleanup(object_key) values(removed.object_key)
    on conflict(object_key) do update set completed_at = null, due_at = now();
  if offer.cover_photo_id = p_photo_id then
    select id into replacement from public.photo_assets where offer_id = p_offer_id and state = 'ready' order by position, id limit 1;
  else replacement := offer.cover_photo_id; end if;
  update public.offers set cover_photo_id = replacement,
    photo_cover_explicit = case when replacement is null then false else photo_cover_explicit end,
    photo_revision = photo_revision + 1 where id = p_offer_id;
  return public.get_offer_photos(p_offer_id);
end $$;
revoke all on function public.remove_photo(uuid,bigint,uuid) from public;
grant execute on function public.remove_photo(uuid,bigint,uuid) to authenticated;
notify pgrst, 'reload schema';

create or replace function public.cancel_photos(p_ids uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  -- Match the offer-first lock order used by finalization and offer deletion.
  perform 1 from public.offers where id in (select offer_id from public.photo_assets where id = any(p_ids)) order by id for update;
  if exists(select 1 from public.offers o where o.id in (select a.offer_id from public.photo_assets a where a.id = any(p_ids))
    and (to_jsonb(o)->>'trashed_at') is not null) then
    raise exception 'Offer is in Trash. Restore it before changing photos.' using errcode = '40001';
  end if;
  with cancelled as (
    update public.photo_assets set state = 'deleting' where id = any(p_ids) and state = 'uploading' returning object_key
  ) insert into public.photo_cleanup(object_key) select object_key from cancelled
    on conflict (object_key) do update set completed_at = null, due_at = now();
end $$;

notify pgrst, 'reload schema';
