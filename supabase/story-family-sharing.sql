-- عمرتي حكاية: private family access, visit photos and voluntary GPS check-in.
-- Run AFTER supabase/story-and-adhkar.sql in the existing Supabase SQL Editor.
-- Family members must sign in with their own Supabase account.
-- No public media bucket, no location tracking in the background.

alter table public.omra_story_stops
  add column if not exists share_with_family boolean not null default false;
alter table public.omra_story_stops
  add column if not exists latitude double precision;
alter table public.omra_story_stops
  add column if not exists longitude double precision;
alter table public.omra_story_stops
  add column if not exists location_accuracy_m double precision;
alter table public.omra_story_stops
  add column if not exists location_shared_at timestamptz;
do $$
begin
 if not exists (
  select 1 from pg_catalog.pg_constraint
  where conname='omra_story_valid_coordinates'
    and conrelid='public.omra_story_stops'::regclass
 ) then
  alter table public.omra_story_stops add constraint omra_story_valid_coordinates check (
   (latitude is null and longitude is null and location_shared_at is null and location_accuracy_m is null)
   or (latitude between -90 and 90 and longitude between -180 and 180
       and location_shared_at is not null
       and (location_accuracy_m is null or location_accuracy_m between 0 and 100000))
  );
 end if;
end $$;

create table if not exists public.omra_family_viewers (
 invite_id uuid not null references public.omra_story_invites(id) on delete cascade,
 viewer_user_id uuid not null references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(invite_id,viewer_user_id)
);
create index if not exists omra_family_viewer_user_idx
 on public.omra_family_viewers(viewer_user_id);

create table if not exists public.omra_family_codes (
 id uuid primary key default gen_random_uuid(),
 invite_id uuid not null references public.omra_story_invites(id) on delete cascade,
 token_hash text not null unique,
 created_by uuid not null references auth.users(id) on delete cascade,
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '14 days'),
 used_by uuid references auth.users(id) on delete set null,
 used_at timestamptz
);
create index if not exists omra_family_codes_invite_idx
 on public.omra_family_codes(invite_id);

alter table public.omra_family_viewers enable row level security;
alter table public.omra_family_codes enable row level security;
revoke all on public.omra_family_viewers from anon,authenticated;
revoke all on public.omra_family_codes from anon,authenticated;
grant select on public.omra_family_viewers to authenticated;
-- Codes never exposed through SELECT; only through secure RPCs.

drop policy if exists omra_family_viewers_select on public.omra_family_viewers;
create policy omra_family_viewers_select on public.omra_family_viewers
 for select to authenticated using (
  viewer_user_id=(select auth.uid())
  or exists (
   select 1 from public.omra_story_invites i
   where i.id=invite_id and i.linked_user_id=(select auth.uid())
  )
 );

-- SECURITY DEFINER helper avoids recursive RLS reads when looking up family grants.
create or replace function public.omra_is_family_viewer(p_invite_id uuid)
returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.omra_family_viewers v
  join public.omra_story_invites i on i.id=v.invite_id
  where v.invite_id=p_invite_id
   and v.viewer_user_id=(select auth.uid())
   and v.revoked_at is null
   and i.revoked_at is null
   and i.linked_user_id is not null
 );
$$;
revoke all on function public.omra_is_family_viewer(uuid) from public,anon;
grant execute on function public.omra_is_family_viewer(uuid) to authenticated;

drop policy if exists omra_story_family_invite_read on public.omra_story_invites;
create policy omra_story_family_invite_read on public.omra_story_invites
 for select to authenticated using(public.omra_is_family_viewer(id));

drop policy if exists omra_story_stops_family_read on public.omra_story_stops;
create policy omra_story_stops_family_read on public.omra_story_stops
 for select to authenticated using(
  share_with_family=true and public.omra_is_family_viewer(invite_id)
 );

-- Family access is read-only. A family code is single-use and shown once.
create or replace function public.omra_issue_family_code(p_invite_id uuid)
returns text
language plpgsql security definer set search_path='' as $$
declare v_raw text; v_code text;
begin
 if (select auth.uid()) is null
    or not exists (
      select 1 from public.omra_story_invites i
      where i.id=p_invite_id and i.linked_user_id=(select auth.uid())
        and i.revoked_at is null and i.expires_at>now()
    ) then raise exception 'Trip owner access required' using errcode='42501'; end if;
 v_raw=upper(left(replace(gen_random_uuid()::text,'-',''),20));
 v_code='FM-'||substr(v_raw,1,4)||'-'||substr(v_raw,5,4)||'-'||
        substr(v_raw,9,4)||'-'||substr(v_raw,13,4)||'-'||substr(v_raw,17,4);
 insert into public.omra_family_codes(invite_id,token_hash,created_by)
 values(p_invite_id,
        encode(pg_catalog.sha256(pg_catalog.convert_to(
          lower(replace(v_code,'-','')),'UTF8')),'hex'),
        (select auth.uid()));
 return v_code;
end
$$;
revoke all on function public.omra_issue_family_code(uuid) from public,anon;
grant execute on function public.omra_issue_family_code(uuid) to authenticated;

create or replace function public.omra_claim_family_code(p_code text)
returns uuid
language plpgsql security definer set search_path='' as $$
declare v_norm text; v_code public.omra_family_codes%rowtype;
        v_invite public.omra_story_invites%rowtype;
begin
 if (select auth.uid()) is null then
  raise exception 'Login required' using errcode='42501'; end if;
 v_norm=lower(regexp_replace(trim(coalesce(p_code,'')),'[-[:space:]]','','g'));
 if v_norm !~ '^fm[0-9a-f]{20}$' then
  raise exception 'Invalid family code'; end if;
 select * into v_code from public.omra_family_codes
  where token_hash=encode(pg_catalog.sha256(pg_catalog.convert_to(v_norm,'UTF8')),'hex')
  for update;
 if not found or v_code.used_at is not null or v_code.expires_at<=now() then
  raise exception 'Family code expired or already used'; end if;
 select * into v_invite from public.omra_story_invites
  where id=v_code.invite_id and revoked_at is null and linked_user_id is not null;
 if not found then raise exception 'Trip is unavailable'; end if;
 if v_invite.linked_user_id=(select auth.uid()) then
  raise exception 'Use your own trip account'; end if;
 insert into public.omra_family_viewers(invite_id,viewer_user_id)
 values(v_code.invite_id,(select auth.uid()))
 on conflict(invite_id,viewer_user_id) do update
 set revoked_at=null,granted_at=now();
 update public.omra_family_codes set used_at=now(),used_by=(select auth.uid())
 where id=v_code.id;
 return v_code.invite_id;
end
$$;
revoke all on function public.omra_claim_family_code(text) from public,anon;
grant execute on function public.omra_claim_family_code(text) to authenticated;

create or replace function public.omra_revoke_family_viewer(
 p_invite_id uuid,p_viewer_user_id uuid)
returns void
language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null
   or not exists (
      select 1 from public.omra_story_invites i
      where i.id=p_invite_id and i.linked_user_id=(select auth.uid())
   ) then raise exception 'Trip owner access required' using errcode='42501'; end if;
 update public.omra_family_viewers set revoked_at=now()
 where invite_id=p_invite_id and viewer_user_id=p_viewer_user_id;
end
$$;
revoke all on function public.omra_revoke_family_viewer(uuid,uuid) from public,anon;
grant execute on function public.omra_revoke_family_viewer(uuid,uuid) to authenticated;

create table if not exists public.omra_story_photos (
 id uuid primary key default gen_random_uuid(),
 invite_id uuid not null references public.omra_story_invites(id) on delete cascade,
 stop_id uuid not null references public.omra_story_stops(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique
   check(char_length(storage_path) between 15 and 350),
 caption text not null default '' check(char_length(caption)<=250),
 created_at timestamptz not null default now()
);
create index if not exists omra_story_photos_stop_idx on public.omra_story_photos(stop_id);
alter table public.omra_story_photos enable row level security;
revoke all on public.omra_story_photos from anon,authenticated;
grant select,insert,delete on public.omra_story_photos to authenticated;

drop policy if exists omra_story_photos_read on public.omra_story_photos;
create policy omra_story_photos_read on public.omra_story_photos
 for select to authenticated using(
  (owner_id=(select auth.uid()) and exists(
   select 1 from public.omra_story_invites i
   where i.id=invite_id and i.linked_user_id=(select auth.uid())
       and i.revoked_at is null
  )) or (
   public.omra_is_family_viewer(invite_id)
   and exists(
    select 1 from public.omra_story_stops s
    where s.id=stop_id and s.invite_id=invite_id
      and s.share_with_family=true
   )
  )
 );
drop policy if exists omra_story_photos_insert on public.omra_story_photos;
create policy omra_story_photos_insert on public.omra_story_photos
 for insert to authenticated with check(
  owner_id=(select auth.uid())
  and split_part(storage_path,'/',1)=(select auth.uid())::text
  and split_part(storage_path,'/',2)=invite_id::text
  and exists(
   select 1 from public.omra_story_stops s
   join public.omra_story_invites i on i.id=s.invite_id
   where s.id=stop_id and s.invite_id=invite_id
    and s.owner_id=(select auth.uid())
    and i.linked_user_id=(select auth.uid()) and i.revoked_at is null
  )
 );
drop policy if exists omra_story_photos_delete on public.omra_story_photos;
create policy omra_story_photos_delete on public.omra_story_photos
 for delete to authenticated using(owner_id=(select auth.uid()));

-- Existing bucket remains PRIVATE. Family storage reads require a shared
-- stop AND a registered photo record AND an active authenticated family grant.
drop policy if exists wv_omra_private_family_select on storage.objects;
create policy wv_omra_private_family_select on storage.objects
 for select to authenticated using(
  bucket_id='wv-omra-private'
  and exists(
   select 1 from public.omra_story_photos p
   join public.omra_story_stops s on s.id=p.stop_id
   where p.storage_path=name and p.invite_id=s.invite_id
    and s.share_with_family=true
    and public.omra_is_family_viewer(p.invite_id)
  )
 );

select pg_catalog.pg_notify('pgrst','reload schema');
