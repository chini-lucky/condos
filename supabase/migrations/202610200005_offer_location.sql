-- Official-verified reference station identities, separate from rental offers.
create table public.rail_station_reference (id text primary key, name text not null);
revoke all on public.rail_station_reference from anon, authenticated;
grant select on public.rail_station_reference to anon, authenticated;
insert into public.rail_station_reference (id,name) values
('N9','Ha Yaek Lat Phrao'),
('N8','Mo Chit'),
('N7','Saphan Khwai'),
('N5','Ari'),
('N4','Sanam Pao'),
('N3','Victory Monument'),
('N2','Phaya Thai'),
('N1','Ratchathewi'),
('CEN','Siam'),
('E1','Chit Lom'),
('E2','Phloen Chit'),
('E3','Nana'),
('E4','Asok'),
('E5','Phrom Phong'),
('E6','Thong Lo'),
('E7','Ekkamai'),
('E8','Phra Khanong'),
('E9','On Nut'),
('E10','Bang Chak'),
('E11','Punnawithi'),
('E12','Udom Suk'),
('E13','Bang Na'),
('E14','Bearing'),
('W1','National Stadium'),
('S1','Ratchadamri'),
('S2','Sala Daeng'),
('S3','Chong Nonsi'),
('S4','Saint Louis'),
('S5','Surasak'),
('S6','Saphan Taksin'),
('S7','Krung Thon Buri'),
('S8','Wongwian Yai'),
('S9','Pho Nimit'),
('S10','Talat Phlu'),
('S11','Wutthakat'),
('S12','Bang Wa'),
('BL01','Tha Phra'),
('BL02','Charan 13'),
('BL03','Fai Chai'),
('BL04','Bang Khun Non'),
('BL05','Bang Yi Khan'),
('BL06','Sirindhorn'),
('BL07','Bang Phlat'),
('BL08','Bang O'),
('BL09','Bang Pho'),
('BL10','Tao Poon'),
('BL11','Bang Sue'),
('BL12','Kamphaeng Phet'),
('BL13','Chatuchak Park'),
('BL14','Phahon Yothin'),
('BL15','Lat Phrao'),
('BL16','Ratchadaphisek'),
('BL17','Sutthisan'),
('BL18','Huai Khwang'),
('BL19','Thailand Cultural Centre'),
('BL20','Phra Ram 9'),
('BL21','Phetchaburi'),
('BL23','Queen Sirikit National Convention Centre'),
('BL24','Khlong Toei'),
('BL25','Lumphini'),
('BL26','Si Lom'),
('BL27','Sam Yan'),
('BL28','Hua Lamphong'),
('BL29','Wat Mangkon'),
('BL30','Sam Yot'),
('BL31','Sanam Chai'),
('BL32','Itsaraphap'),
('BL34','Bang Wa'),
('BL22','Sukhumvit'),
('BL33','Bang Phai'),
('BL35','Phetkasem 48'),
('BL36','Phasi Charoen'),
('BL37','Bang Khae'),
('BL38','Lak Song'),
('N24','Khu Khot'),
('N23','Yaek Kor Por Aor'),
('N22','Royal Thai Air Force Museum'),
('N21','Bhumibol Adulyadej Hospital'),
('N20','Saphan Mai'),
('N19','Sai Yud'),
('N18','Phahon Yothin 59'),
('N17','Wat Phra Sri Mahathat'),
('N16','11th Infantry Regiment'),
('N15','Bang Bua'),
('N14','Royal Forest Department'),
('N13','Kasetsart University'),
('N12','Sena Nikhom'),
('N11','Ratchayothin'),
('N10','Phahon Yothin 24'),
('E15','Samrong'),
('E16','Pu Chao'),
('E17','Chang Erawan'),
('E18','Royal Thai Naval Academy'),
('E19','Pak Nam'),
('E20','Srinagarindra'),
('E21','Phraek Sa'),
('E22','Sai Luat'),
('E23','Kheha');

alter table public.offers
  add column station_id text references public.rail_station_reference(id),
  add column walking_metres double precision check (walking_metres >= 0 and walking_metres < 'Infinity'::double precision),
  add column bearing double precision check (bearing >= 0 and bearing < 360);

create function public.validate_offer_location_patch(p_patch jsonb) returns void
language plpgsql set search_path = '' as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Offer details must be an object' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_object_keys(p_patch) as key where key not in ('station_id','walking_metres','bearing')) then
    raise exception 'Unknown offer detail' using errcode='22023';
  end if;
  if p_patch ? 'station_id' and jsonb_typeof(p_patch->'station_id') not in ('string','null') then
    raise exception 'Station must be an identity or null' using errcode='22023';
  end if;
  if (p_patch ? 'walking_metres' and jsonb_typeof(p_patch->'walking_metres') not in ('number','null'))
    or (p_patch ? 'bearing' and jsonb_typeof(p_patch->'bearing') not in ('number','null')) then
    raise exception 'Distance and bearing must be numeric or null' using errcode='22023';
  end if;
end $$;
revoke all on function public.validate_offer_location_patch(jsonb) from public;

create function public.create_offer_details(p_name text,p_patch jsonb default '{}') returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  perform public.validate_offer_location_patch(p_patch);
  insert into public.offers(name,station_id,walking_metres,bearing)
  values(public.trim_offer_name(p_name),p_patch->>'station_id',(p_patch->>'walking_metres')::double precision,(p_patch->>'bearing')::double precision)
  returning * into result;
  return result;
end $$;
revoke all on function public.create_offer_details(text,jsonb) from public;
grant execute on function public.create_offer_details(text,jsonb) to authenticated;

create function public.save_offer(p_id uuid,p_expected_version bigint,p_name text,p_patch jsonb default '{}') returns public.offers
language plpgsql security definer set search_path = '' as $$
declare result public.offers;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  perform public.validate_offer_location_patch(p_patch);
  update public.offers set
    name=public.trim_offer_name(p_name),
    station_id=case when p_patch ? 'station_id' then p_patch->>'station_id' else station_id end,
    walking_metres=case when p_patch ? 'walking_metres' then (p_patch->>'walking_metres')::double precision else walking_metres end,
    bearing=case when p_patch ? 'bearing' then (p_patch->>'bearing')::double precision else bearing end,
    version=version+1,updated_at=clock_timestamp()
  where id=p_id and version=p_expected_version returning * into result;
  if not found then raise exception 'Offer changed or is no longer available' using errcode='40001'; end if;
  return result;
end $$;
revoke all on function public.save_offer(uuid,bigint,text,jsonb) from public;
grant execute on function public.save_offer(uuid,bigint,text,jsonb) to authenticated;
