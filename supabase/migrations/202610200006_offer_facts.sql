-- Extends the atomic location mutation introduced by 202610200005.
alter table public.offers
  add column rent numeric check (rent > 0 and rent < 'Infinity'::numeric),
  add column property_type text check (property_type in ('condominium', 'townhouse')),
  add column size_sqm numeric check (size_sqm > 0 and size_sqm < 'Infinity'::numeric),
  add column beds integer check (beds >= 0),
  add column floor integer,
  add column washer boolean,
  add column garden boolean,
  add column pool boolean,
  add column microwave boolean,
  add column extra_facilities text[] not null default '{}';

create function public.validate_offer_facts(p_patch jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare key text; item jsonb; names text[] := '{}'; cleaned text;
begin
  for key, item in select * from jsonb_each(p_patch) loop
    if key in ('rent','size_sqm','beds','floor') and jsonb_typeof(item) not in ('null','number') then
      raise exception 'Numeric facts must be numbers or unknown' using errcode='22023';
    elsif key in ('washer','garden','pool','microwave') and jsonb_typeof(item) not in ('null','boolean') then
      raise exception 'Facilities must be present, absent or unknown' using errcode='22023';
    elsif key = 'property_type' and jsonb_typeof(item) not in ('null','string') then
      raise exception 'Invalid property type' using errcode='22023';
    end if;
    if key in ('beds','floor') and jsonb_typeof(item)='number' and (item #>> '{}')::numeric <> trunc((item #>> '{}')::numeric) then
      raise exception 'Beds and floor must be whole numbers' using errcode='22023';
    end if;
  end loop;
  if p_patch ? 'extra_facilities' then
    if jsonb_typeof(p_patch->'extra_facilities') <> 'array' then raise exception 'Extra facilities must be a list' using errcode='22023'; end if;
    for item in select * from jsonb_array_elements(p_patch->'extra_facilities') loop
      if jsonb_typeof(item) <> 'string' then raise exception 'Facility names must be text' using errcode='22023'; end if;
      cleaned := public.trim_offer_name(item #>> '{}');
      if cleaned = '' or lower(cleaned) = any(select lower(n) from unnest(names) n) then
        raise exception 'Facility names must be nonblank and unique' using errcode='22023';
      end if;
      names := array_append(names, cleaned);
    end loop;
    p_patch := jsonb_set(p_patch, '{extra_facilities}', to_jsonb(names));
  end if;
  return p_patch;
end $$;

revoke all on function public.validate_offer_facts(jsonb) from public;
create function public.validate_offer_patch(p_patch jsonb) returns jsonb
language plpgsql set search_path = '' as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'Offer details must be an object' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) as key where key not in ('station_id','walking_metres','bearing','rent','property_type','size_sqm','beds','floor','washer','garden','pool','microwave','extra_facilities')) then
    raise exception 'Unknown offer detail' using errcode='22023';
  end if;
  perform public.validate_offer_location_patch(jsonb_build_object('station_id', p_patch->'station_id','walking_metres',p_patch->'walking_metres','bearing',p_patch->'bearing'));
  return public.validate_offer_facts(p_patch);
end $$;
revoke all on function public.validate_offer_patch(jsonb) from public;

create or replace function public.create_offer_details(p_name text,p_patch jsonb default '{}') returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  p_patch := public.validate_offer_patch(p_patch);
  insert into public.offers(name,station_id,walking_metres,bearing,rent,property_type,size_sqm,beds,floor,washer,garden,pool,microwave,extra_facilities)
  values(public.trim_offer_name(p_name),(p_patch->>'station_id')::text,(p_patch->>'walking_metres')::double precision,(p_patch->>'bearing')::double precision,(p_patch->>'rent')::numeric,(p_patch->>'property_type')::text,(p_patch->>'size_sqm')::numeric,(p_patch->>'beds')::integer,(p_patch->>'floor')::integer,(p_patch->>'washer')::boolean,(p_patch->>'garden')::boolean,(p_patch->>'pool')::boolean,(p_patch->>'microwave')::boolean,array(select jsonb_array_elements_text(p_patch->'extra_facilities'))) returning * into result;
  return result;
end $$;
create or replace function public.save_offer(p_id uuid,p_expected_version bigint,p_name text,p_patch jsonb default '{}') returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  p_patch := public.validate_offer_patch(p_patch);
  update public.offers set name=public.trim_offer_name(p_name),
    station_id=case when p_patch ? 'station_id' then (p_patch->>'station_id')::text else station_id end,
    walking_metres=case when p_patch ? 'walking_metres' then (p_patch->>'walking_metres')::double precision else walking_metres end,
    bearing=case when p_patch ? 'bearing' then (p_patch->>'bearing')::double precision else bearing end,
    rent=case when p_patch ? 'rent' then (p_patch->>'rent')::numeric else rent end,
    property_type=case when p_patch ? 'property_type' then (p_patch->>'property_type')::text else property_type end,
    size_sqm=case when p_patch ? 'size_sqm' then (p_patch->>'size_sqm')::numeric else size_sqm end,
    beds=case when p_patch ? 'beds' then (p_patch->>'beds')::integer else beds end,
    floor=case when p_patch ? 'floor' then (p_patch->>'floor')::integer else floor end,
    washer=case when p_patch ? 'washer' then (p_patch->>'washer')::boolean else washer end,
    garden=case when p_patch ? 'garden' then (p_patch->>'garden')::boolean else garden end,
    pool=case when p_patch ? 'pool' then (p_patch->>'pool')::boolean else pool end,
    microwave=case when p_patch ? 'microwave' then (p_patch->>'microwave')::boolean else microwave end,
    extra_facilities=case when p_patch ? 'extra_facilities' then array(select jsonb_array_elements_text(p_patch->'extra_facilities')) else extra_facilities end,
    version=version+1,updated_at=clock_timestamp()
  where id=p_id and version=p_expected_version returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode='40001'; end if;
  return result;
end $$;
