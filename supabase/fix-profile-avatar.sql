-- Walid Voyages / عمرتي حكايتي - repair optional profile avatar storage (v24).
-- Run in the existing Supabase project AFTER story-and-adhkar.sql.
-- Safe to run again. No public bucket and no anonymous access.
alter table public.omra_story_invites
 add column if not exists avatar_path text;
do $$
begin
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.omra_story_invites'::regclass
    and conname='omra_story_avatar_path_valid'
 ) then
  alter table public.omra_story_invites
   add constraint omra_story_avatar_path_valid
   check (
    avatar_path is null
    or (char_length(avatar_path) between 30 and 350
        and avatar_path ~ '^[0-9a-f-]+/[0-9a-f-]+/avatar/[0-9a-f-]+\.(jpg|png|webp)$')
   );
 end if;
end $$;

-- The storage bucket stays PRIVATE; 7 MiB is ample for compressed avatars.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('wv-omra-private','wv-omra-private',false,7340032,
        array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

-- Add granular owner-only storage permissions so the profile image can
-- upload even if earlier gallery permissions were not applied.
drop policy if exists wv_omra_avatar_upload on storage.objects;
create policy wv_omra_avatar_upload on storage.objects
 for insert to authenticated
 with check (
  bucket_id='wv-omra-private'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[3]='avatar'
  and name ~ '^[0-9a-f-]+/[0-9a-f-]+/avatar/[0-9a-f-]+\.(jpg|png|webp)$'
  and exists (
   select 1 from public.omra_story_invites i
   where i.id::text=(storage.foldername(name))[2]
     and i.linked_user_id=(select auth.uid())
     and i.revoked_at is null
  )
 );
drop policy if exists wv_omra_avatar_owner_read on storage.objects;
create policy wv_omra_avatar_owner_read on storage.objects
 for select to authenticated
 using (
  bucket_id='wv-omra-private'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[3]='avatar'
 );
drop policy if exists wv_omra_avatar_owner_delete on storage.objects;
create policy wv_omra_avatar_owner_delete on storage.objects
 for delete to authenticated
 using (
  bucket_id='wv-omra-private'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and (storage.foldername(name))[3]='avatar'
 );

create or replace function public.omra_set_story_avatar(
 p_invite_id uuid,p_path text
) returns void
language plpgsql security definer set search_path='' as $$
declare v_uid uuid;
begin
 v_uid=(select auth.uid());
 if v_uid is null or not exists (
  select 1 from public.omra_story_invites i
   where i.id=p_invite_id
     and i.linked_user_id=v_uid and i.revoked_at is null
 ) then
  raise exception 'Trip owner access required' using errcode='42501';
 end if;
 if p_path is not null then
  if p_path !~ '^[0-9a-f-]+/[0-9a-f-]+/avatar/[0-9a-f-]+\.(jpg|png|webp)$'
   or left(p_path,char_length(v_uid::text||'/'||p_invite_id::text||'/avatar/'))
      <> v_uid::text||'/'||p_invite_id::text||'/avatar/'
   or not exists (
    select 1 from storage.objects o
    where o.bucket_id='wv-omra-private' and o.name=p_path
   ) then
   raise exception 'Invalid avatar path' using errcode='22023';
  end if;
 end if;
 update public.omra_story_invites
  set avatar_path=p_path where id=p_invite_id and linked_user_id=v_uid;
end
$$;
revoke all on function public.omra_set_story_avatar(uuid,text) from public,anon;
grant execute on function public.omra_set_story_avatar(uuid,text) to authenticated;

select pg_catalog.pg_notify('pgrst','reload schema');
