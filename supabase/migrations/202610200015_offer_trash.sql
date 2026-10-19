alter table public.offers add column trashed_at timestamptz;
create index offers_trash_date on public.offers(trashed_at) where trashed_at is not null;

-- Every existing/future offer update inherits the parent lifecycle guard.
-- Restoration is the only update allowed while an offer is in Trash.
create function public.guard_trashed_offer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.trashed_at is not null and new.trashed_at is not null then
    raise exception 'Offer is in Trash. Restore it before making changes.' using errcode = '40001';
  end if;
  return new;
end $$;
create trigger guard_trashed_offer before update on public.offers
for each row execute function public.guard_trashed_offer();

-- Lock the parent so note changes cannot race a move to Trash.
create function public.guard_trashed_offer_note() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parent_id uuid; parent_trash timestamptz;
begin
  if tg_op = 'DELETE' then parent_id := old.offer_id; else parent_id := new.offer_id; end if;
  select trashed_at into parent_trash from public.offers where id = parent_id for update;
  -- A missing parent on DELETE is a later permanent-delete FK cascade.
  if parent_trash is not null then
    raise exception 'Offer is in Trash. Restore it before changing notes.' using errcode = '40001';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
create trigger guard_trashed_offer_note before insert or update or delete on public.offer_notes
for each row execute function public.guard_trashed_offer_note();

create function public.trash_offer(p_id uuid, p_expected_version bigint) returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  update public.offers set trashed_at = clock_timestamp(), version = version + 1, updated_at = clock_timestamp()
    where id = p_id and version = p_expected_version and trashed_at is null returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode = '40001'; end if;
  -- Ready photos are retained. In-flight uploads become durable cleanup jobs.
  -- Conditional installation supports local ticket stacks before #10 is integrated.
  if to_regclass('public.photo_assets') is not null then
    with cancelled as (
      update public.photo_assets set state = 'deleting' where offer_id = p_id and state = 'uploading' returning object_key
    ) insert into public.photo_cleanup(object_key) select object_key from cancelled
      on conflict (object_key) do update set completed_at = null, due_at = now();
  end if;
  return result;
end $$;
create function public.restore_offer(p_id uuid, p_expected_version bigint) returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  update public.offers set trashed_at = null, version = version + 1, updated_at = clock_timestamp()
    where id = p_id and version = p_expected_version and trashed_at is not null returning * into result;
  if not found then raise exception 'Offer changed or is no longer in Trash' using errcode = '40001'; end if;
  return result;
end $$;
revoke all on function public.guard_trashed_offer(), public.guard_trashed_offer_note(), public.trash_offer(uuid,bigint), public.restore_offer(uuid,bigint) from public;
grant execute on function public.trash_offer(uuid,bigint), public.restore_offer(uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
