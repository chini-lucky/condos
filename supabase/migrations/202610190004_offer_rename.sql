create function public.rename_offer(p_id uuid, p_name text, p_expected_version bigint)
returns public.offers language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  update public.offers set name = btrim(p_name), version = version + 1, updated_at = clock_timestamp()
    where id = p_id and version = p_expected_version returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode = '40001'; end if;
  return result;
end $$;
revoke all on function public.rename_offer(uuid,text,bigint) from public;
grant execute on function public.rename_offer(uuid,text,bigint) to authenticated;
