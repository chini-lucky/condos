alter table public.offers
  add column pending_explanation text,
  add column rejection_reason text,
  add column viewing_at timestamptz check (viewing_at is null or isfinite(viewing_at));

create function public.update_offer_status(
  p_id uuid, p_expected_version bigint, p_status text,
  p_pending_explanation text, p_rejection_reason text, p_viewing_at timestamptz
) returns public.offers language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  update public.offers set
    status = p_status,
    pending_explanation = nullif(public.trim_offer_name(p_pending_explanation), ''),
    rejection_reason = nullif(public.trim_offer_name(p_rejection_reason), ''),
    viewing_at = p_viewing_at,
    version = version + 1, updated_at = clock_timestamp()
    where id = p_id and version = p_expected_version returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode = '40001'; end if;
  return result;
end $$;
revoke all on function public.update_offer_status(uuid,bigint,text,text,text,timestamptz) from public;
grant execute on function public.update_offer_status(uuid,bigint,text,text,text,timestamptz) to authenticated;
