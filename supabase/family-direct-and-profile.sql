-- Omarati Hkayti: code-only family following (no email/password form), optional private avatar.
-- Required: run story-and-adhkar.sql and story-family-sharing.sql FIRST.
-- Enable Anonymous Sign-ins in Supabase Authentication > Sign In / Providers.
-- Anonymous Supabase Auth sessions are created invisibly, separately from pilgrim accounts.
-- The bearer FM code is reusable until expiry/revocation; keep it private.

alter table public.omra_family_codes
 add column if not exists revoked_at timestamptz;

alter table public.omra_story_invites
 add column if not exists avatar_path text
 check(avatar_path is null or char_length(avatar_path) between 30 and 350);

-- The account owning the Umra can set its own optional private profile photo.
create or replace function public.omra_set_story_avatar(
 p_invite_id uuid,p_path text
) returns void
language plpgsql security definer set search_path='' as $$
declare v_uid uuid;
begin
 v_uid=(select auth.uid());
 if v_uid is null or not exists (
  select 1 from public.omra_story_invites i
  where i.id=p_invite_id and i.linked_user_id=v_uid and i.revoked_at is null
 ) then raise exception 'Trip owner access required' using errcode='42501'; end if;
 if p_path is not null then
  if left(p_path,char_length(v_uid::text||'/'||p_invite_id::text||'/avatar/'))
     <> v_uid::text||'/'||p_invite_id::text||'/avatar/'
    or p_path !~ '^[0-9a-f-]+/[0-9a-f-]+/avatar/[0-9a-f-]+\.(jpg|png|webp)$'
    or not exists(
     select 1 from storage.objects o
     where o.bucket_id='wv-omra-private' and o.name=p_path
    )
  then raise exception 'Invalid avatar path'; end if;
 end if;
 update public.omra_story_invites set avatar_path=p_path where id=p_invite_id;
end
$$;
revoke all on function public.omra_set_story_avatar(uuid,text) from public,anon;
grant execute on function public.omra_set_story_avatar(uuid,text) to authenticated;

-- Allow an authorized family viewer to read ONLY the selected owner's avatar
-- and ONLY photos from stops that the trip owner marked shared.
drop policy if exists wv_omra_private_family_select on storage.objects;
create policy wv_omra_private_family_select on storage.objects
 for select to authenticated using(
  bucket_id='wv-omra-private'
  and (
   exists(
    select 1 from public.omra_story_photos p
    join public.omra_story_stops s on s.id=p.stop_id and s.invite_id=p.invite_id
    where p.storage_path=name and s.share_with_family=true
     and public.omra_is_family_viewer(p.invite_id)
   )
   or exists(
    select 1 from public.omra_story_invites i
    where i.avatar_path=name and public.omra_is_family_viewer(i.id)
   )
  )
 );

-- Unlike the old one-use family code, one FM code now admits multiple
-- relatives (each receives its own hidden anonymous Supabase Auth session).
-- The owner may disable all open codes and family access at any time.
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
 if not found or v_code.revoked_at is not null or v_code.expires_at<=now() then
  raise exception 'Family code expired or revoked'; end if;
 select * into v_invite from public.omra_story_invites
  where id=v_code.invite_id and revoked_at is null
   and linked_user_id is not null and expires_at>now();
 if not found then raise exception 'Trip is unavailable'; end if;
 if v_invite.linked_user_id=(select auth.uid()) then
  raise exception 'Use your own trip account'; end if;
 insert into public.omra_family_viewers(invite_id,viewer_user_id)
 values(v_code.invite_id,(select auth.uid()))
 on conflict(invite_id,viewer_user_id) do update
  set revoked_at=null,granted_at=now();
 update public.omra_family_codes
  set used_at=coalesce(used_at,now()),used_by=coalesce(used_by,(select auth.uid()))
  where id=v_code.id;
 return v_code.invite_id;
end
$$;
revoke all on function public.omra_claim_family_code(text) from public,anon;
grant execute on function public.omra_claim_family_code(text) to authenticated;

create or replace function public.omra_disable_family_access(p_invite_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists (
  select 1 from public.omra_story_invites i
  where i.id=p_invite_id and i.linked_user_id=(select auth.uid())
 ) then raise exception 'Trip owner access required' using errcode='42501'; end if;
 update public.omra_family_codes set revoked_at=now()
  where invite_id=p_invite_id and revoked_at is null;
 update public.omra_family_viewers set revoked_at=now()
  where invite_id=p_invite_id and revoked_at is null;
end
$$;
revoke all on function public.omra_disable_family_access(uuid) from public,anon;
grant execute on function public.omra_disable_family_access(uuid) to authenticated;

select pg_catalog.pg_notify('pgrst','reload schema');
