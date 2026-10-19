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
