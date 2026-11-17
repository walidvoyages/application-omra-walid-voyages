-- Walid Voyages / عمرتي حكايتي - opt-in agency monitoring (v23).
-- Run AFTER schema.sql, story-and-adhkar.sql, and story-family-sharing.sql.
-- The master agency code is NOT a replacement for Supabase administrator authentication.
-- Every stop defaults PRIVATE. Only the pilgrim can grant agency visibility.
alter table public.omra_story_stops
  add column if not exists share_with_agency boolean not null default false;

create table if not exists public.omra_monitor_config (
  singleton boolean primary key default true check(singleton),
  code_hash text not null,
  changed_at timestamptz not null default now()
);
create table if not exists public.omra_monitor_sessions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create table if not exists public.omra_monitor_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failure_count integer not null default 0,
  blocked_until timestamptz
);
alter table public.omra_monitor_config enable row level security;
alter table public.omra_monitor_sessions enable row level security;
alter table public.omra_monitor_attempts enable row level security;
revoke all on public.omra_monitor_config from public,anon,authenticated;
revoke all on public.omra_monitor_sessions from public,anon,authenticated;
revoke all on public.omra_monitor_attempts from public,anon,authenticated;

create or replace function public.omra_monitor_is_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null and exists (
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())
 );
$$;
revoke all on function public.omra_monitor_is_admin() from public,anon;
grant execute on function public.omra_monitor_is_admin() to authenticated;

create or replace function public.omra_monitor_has_access()
returns boolean language sql stable security definer set search_path=''
as $$
 select public.omra_monitor_is_admin() and exists(
  select 1 from public.omra_monitor_sessions s
  where s.user_id=(select auth.uid()) and s.expires_at>now()
 );
$$;
revoke all on function public.omra_monitor_has_access() from public,anon;
grant execute on function public.omra_monitor_has_access() to authenticated;

create or replace function public.omra_monitor_status()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.omra_monitor_is_admin() then
  raise exception 'Admin login required' using errcode='42501';
 end if;
 return jsonb_build_object(
  'configured',(select exists(select 1 from public.omra_monitor_config)),
  'unlocked',public.omra_monitor_has_access()
 );
end;
$$;
revoke all on function public.omra_monitor_status() from public,anon;
grant execute on function public.omra_monitor_status() to authenticated;

create or replace function public.omra_monitor_set_code(p_code text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not public.omra_monitor_is_admin() then
  raise exception 'Admin login required' using errcode='42501';
 end if;
 if char_length(trim(coalesce(p_code,''))) < 16
   or char_length(trim(coalesce(p_code,''))) > 120 then
  raise exception 'Use a strong code of 16 to 120 characters';
 end if;
 insert into public.omra_monitor_config(singleton,code_hash)
 values(true,encode(pg_catalog.sha256(pg_catalog.convert_to(trim(p_code),'UTF8')),'hex'))
 on conflict(singleton) do update set
  code_hash=excluded.code_hash,changed_at=now();
 delete from public.omra_monitor_sessions;
 delete from public.omra_monitor_attempts;
end;
$$;
revoke all on function public.omra_monitor_set_code(text) from public,anon;
grant execute on function public.omra_monitor_set_code(text) to authenticated;

create or replace function public.omra_monitor_unlock(p_code text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_uid uuid; v_hash text; v_failures integer; v_blocked timestamptz;
begin
 if not public.omra_monitor_is_admin() then
  raise exception 'Admin login required' using errcode='42501';
 end if;
 v_uid=(select auth.uid());
 select failure_count,blocked_until into v_failures,v_blocked
 from public.omra_monitor_attempts where user_id=v_uid;
 if v_blocked is not null and v_blocked>now() then
  return false;
 end if;
 select code_hash into v_hash from public.omra_monitor_config where singleton=true;
 if v_hash is null or trim(coalesce(p_code,''))='' or
    v_hash<>encode(pg_catalog.sha256(pg_catalog.convert_to(trim(p_code),'UTF8')),'hex') then
  insert into public.omra_monitor_attempts(user_id,failure_count,blocked_until)
   values(v_uid,1,null)
  on conflict(user_id) do update
   set failure_count=case when public.omra_monitor_attempts.blocked_until<=now()
     then 1 else public.omra_monitor_attempts.failure_count+1 end,
    blocked_until=case when public.omra_monitor_attempts.failure_count>=4
     and (public.omra_monitor_attempts.blocked_until is null or public.omra_monitor_attempts.blocked_until<=now())
     then now()+interval '15 minutes' else public.omra_monitor_attempts.blocked_until end;
  return false;
 end if;
 delete from public.omra_monitor_attempts where user_id=v_uid;
 insert into public.omra_monitor_sessions(user_id,expires_at)
  values(v_uid,now()+interval '60 minutes')
 on conflict(user_id) do update set expires_at=excluded.expires_at;
 return true;
end;
$$;
revoke all on function public.omra_monitor_unlock(text) from public,anon;
grant execute on function public.omra_monitor_unlock(text) to authenticated;

create or replace function public.omra_monitor_lock()
returns void language plpgsql security definer set search_path=''
as $$
begin
 delete from public.omra_monitor_sessions where user_id=(select auth.uid());
end;
$$;
revoke all on function public.omra_monitor_lock() from public,anon;
grant execute on function public.omra_monitor_lock() to authenticated;

-- Agency visibility is explicitly opt-in per stop and always read-only.
drop policy if exists omra_story_stops_agency_read on public.omra_story_stops;
create policy omra_story_stops_agency_read on public.omra_story_stops
 for select to authenticated using(
 share_with_agency=true and public.omra_monitor_has_access()
 and exists(select 1 from public.omra_story_invites i
   where i.id=invite_id and i.revoked_at is null and i.linked_user_id=owner_id)
);
drop policy if exists omra_story_photos_agency_read on public.omra_story_photos;
create policy omra_story_photos_agency_read on public.omra_story_photos
 for select to authenticated using(
 public.omra_monitor_has_access()
 and exists(
  select 1 from public.omra_story_stops s
  join public.omra_story_invites i on i.id=s.invite_id
  where s.id=stop_id and s.invite_id=omra_story_photos.invite_id
   and s.owner_id=omra_story_photos.owner_id
   and s.share_with_agency=true and i.revoked_at is null
 )
);
drop policy if exists wv_omra_private_agency_select on storage.objects;
create policy wv_omra_private_agency_select on storage.objects
 for select to authenticated using(
 bucket_id='wv-omra-private' and public.omra_monitor_has_access()
 and exists(
  select 1 from public.omra_story_photos p
  join public.omra_story_stops s on s.id=p.stop_id
  join public.omra_story_invites i on i.id=p.invite_id
  where p.storage_path=name and p.invite_id=s.invite_id
   and p.owner_id=s.owner_id and s.share_with_agency=true
   and i.revoked_at is null
 )
);
select pg_catalog.pg_notify('pgrst','reload schema');
