-- Add contacts to the existing atomic offer mutations; no separate agent directory.
alter table public.offers
  add column agent_name text,
  add column agent_company text,
  add column agent_phone text,
  add column agent_line text,
  add column source_url text;

create function public.validate_offer_contacts(p_patch jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare key text; value text;
begin
  foreach key in array array['agent_name','agent_company','agent_phone','agent_line','source_url'] loop
    if not p_patch ? key then continue; end if;
    if jsonb_typeof(p_patch->key) not in ('string','null') then raise exception 'Contacts must be text or unknown' using errcode='22023'; end if;
    value := nullif(public.trim_offer_name(p_patch->>key),'');
    if key='agent_phone' and value is not null and
      (value !~ '^\+?[0-9 ()-]{3,40}$' or length(regexp_replace(value,'[^0-9]','','g')) not between 3 and 20) then
      raise exception 'Enter a phone number using digits, spaces, plus, hyphens or parentheses' using errcode='22023';
    end if;
    if key='agent_line' and value is not null and value !~ '^@?[A-Za-z0-9._-]{1,100}$' then
      raise exception 'Enter a LINE ID, not a URL' using errcode='22023';
    end if;
    if key='source_url' and value is not null and
      (value !~ '^https?://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:]]*)?$' or value ~ '[\\[:cntrl:]]') then
      raise exception 'Enter an HTTP or HTTPS source URL without login credentials' using errcode='22023';
    end if;
    p_patch := jsonb_set(p_patch,array[key],coalesce(to_jsonb(value),'null'::jsonb));
  end loop;
  return p_patch;
end $$;
revoke all on function public.validate_offer_contacts(jsonb) from public;

create or replace function public.validate_offer_patch(p_patch jsonb) returns jsonb
language plpgsql set search_path = '' as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then raise exception 'Offer details must be an object' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) as key where key not in ('station_id','walking_metres','bearing','rent','property_type','size_sqm','beds','floor','washer','garden','pool','microwave','extra_facilities','agent_name','agent_company','agent_phone','agent_line','source_url')) then
    raise exception 'Unknown offer detail' using errcode='22023';
  end if;
  perform public.validate_offer_location_patch(jsonb_build_object('station_id', p_patch->'station_id','walking_metres',p_patch->'walking_metres','bearing',p_patch->'bearing'));
  return public.validate_offer_contacts(public.validate_offer_facts(p_patch));
end $$;
revoke all on function public.validate_offer_patch(jsonb) from public;

create or replace function public.create_offer_details(p_name text,p_patch jsonb default '{}') returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  p_patch := public.validate_offer_patch(p_patch);
  insert into public.offers(name,station_id,walking_metres,bearing,rent,property_type,size_sqm,beds,floor,washer,garden,pool,microwave,extra_facilities,agent_name,agent_company,agent_phone,agent_line,source_url)
  values(public.trim_offer_name(p_name),(p_patch->>'station_id')::text,(p_patch->>'walking_metres')::double precision,(p_patch->>'bearing')::double precision,(p_patch->>'rent')::numeric,(p_patch->>'property_type')::text,(p_patch->>'size_sqm')::numeric,(p_patch->>'beds')::integer,(p_patch->>'floor')::integer,(p_patch->>'washer')::boolean,(p_patch->>'garden')::boolean,(p_patch->>'pool')::boolean,(p_patch->>'microwave')::boolean,array(select jsonb_array_elements_text(p_patch->'extra_facilities')),p_patch->>'agent_name',p_patch->>'agent_company',p_patch->>'agent_phone',p_patch->>'agent_line',p_patch->>'source_url') returning * into result;
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
    agent_name=case when p_patch ? 'agent_name' then p_patch->>'agent_name' else agent_name end,
    agent_company=case when p_patch ? 'agent_company' then p_patch->>'agent_company' else agent_company end,
    agent_phone=case when p_patch ? 'agent_phone' then p_patch->>'agent_phone' else agent_phone end,
    agent_line=case when p_patch ? 'agent_line' then p_patch->>'agent_line' else agent_line end,
    source_url=case when p_patch ? 'source_url' then p_patch->>'source_url' else source_url end,
    version=version+1,updated_at=clock_timestamp()
  where id=p_id and version=p_expected_version returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode='40001'; end if;
  return result;
end $$;
