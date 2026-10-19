-- Match JavaScript trim() so bypassing the form cannot create blank names.
create function public.trim_offer_name(value text) returns text
language sql immutable strict set search_path = '' as $$
  select btrim(value, U&' \0009\000A\000B\000C\000D\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')
$$;
alter table public.offers drop constraint offers_name_check;
alter table public.offers add constraint offers_name_check
  check (name = public.trim_offer_name(name) and length(name) > 0);

create or replace function public.create_offer(p_name text) returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  insert into public.offers (name) values (public.trim_offer_name(p_name)) returning * into result;
  return result;
end $$;

create or replace function public.rename_offer(p_id uuid, p_name text, p_expected_version bigint)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  update public.offers set name = public.trim_offer_name(p_name), version = version + 1, updated_at = clock_timestamp()
    where id = p_id and version = p_expected_version returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode = '40001'; end if;
  return result;
end $$;
