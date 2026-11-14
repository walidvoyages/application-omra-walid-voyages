-- Walid Voyages Omra: optional client journeys and admin-created adhkar.
-- Run in EXISTING Supabase project's SQL Editor as a project owner.
-- Do not run migrations from a public web browser; do not add secret keys to GitHub.
-- Admin must already have user_id in public.omra_admins (supabase/schema.sql).

create table if not exists public.omra_client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 150),
  phone text not null default '' check (char_length(phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.omra_client_profiles enable row level security;
revoke all on public.omra_client_profiles from anon,authenticated;
grant select,insert,update on public.omra_client_profiles to authenticated;
drop policy if exists omra_client_own_read on public.omra_client_profiles;
create policy omra_client_own_read on public.omra_client_profiles
  for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists omra_client_own_insert on public.omra_client_profiles;
create policy omra_client_own_insert on public.omra_client_profiles
  for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists omra_client_own_update on public.omra_client_profiles;
create policy omra_client_own_update on public.omra_client_profiles
  for update to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table if not exists public.omra_story_invites (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.omra_programs(id) on delete cascade,
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 150),
  token_hash text not null unique,
  linked_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '1 year'),
  claimed_at timestamptz,
  revoked_at timestamptz
);
create index if not exists omra_story_invites_user_idx on public.omra_story_invites(linked_user_id);
create index if not exists omra_story_invites_program_idx on public.omra_story_invites(program_id);
alter table public.omra_story_invites enable row level security;
revoke all on public.omra_story_invites from anon,authenticated;
grant select on public.omra_story_invites to authenticated;
drop policy if exists omra_story_invite_owner_read on public.omra_story_invites;
create policy omra_story_invite_owner_read on public.omra_story_invites
 for select to authenticated using (
  linked_user_id=(select auth.uid()) AND revoked_at IS NULL
 );
drop policy if exists omra_story_invite_admin_read on public.omra_story_invites;
create policy omra_story_invite_admin_read on public.omra_story_invites
 for select to authenticated using (
  exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid()))
 );

-- The client never queries invitation tokens: only hashes are stored.
-- 64 random hex chars are generated and revealed ONCE to an authorized admin.
create or replace function public.omra_issue_story_invite(p_program_id uuid,p_customer_name text)
returns text
language plpgsql security definer set search_path=''
as $$
declare v_token text;
begin
 if (select auth.uid()) is null or not exists(
   select 1 from public.omra_admins a where a.user_id=(select auth.uid())
 ) then raise exception 'Admin access required' using errcode='42501'; end if;
 if p_customer_name is null or char_length(trim(p_customer_name)) not between 2 and 150 then
   raise exception 'Please provide a customer name'; end if;
 if not exists(select 1 from public.omra_programs p where p.id=p_program_id and p.is_published=true) then
   raise exception 'Only published Omra programs can be linked'; end if;
 v_token=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 insert into public.omra_story_invites(program_id,customer_name,token_hash,created_by)
 values(p_program_id,trim(p_customer_name),encode(pg_catalog.sha256(pg_catalog.convert_to(v_token,'UTF8')),'hex'),(select auth.uid()));
 return v_token;
end
$$;
revoke all on function public.omra_issue_story_invite(uuid,text) from public,anon;
grant execute on function public.omra_issue_story_invite(uuid,text) to authenticated;

create or replace function public.omra_claim_story_invite(p_token text)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_invite public.omra_story_invites%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Login required' using errcode='42501'; end if;
 if p_token is null or p_token !~ '^[0-9A-Fa-f]{64}$' then
   raise exception 'Invalid invitation code'; end if;
 select * into v_invite from public.omra_story_invites
 where token_hash=encode(pg_catalog.sha256(pg_catalog.convert_to(lower(trim(p_token)),'UTF8')),'hex')
 for update;
 if not found or v_invite.revoked_at is not null or v_invite.expires_at<now() then
   raise exception 'Invitation unavailable or expired'; end if;
 if v_invite.linked_user_id is not null and v_invite.linked_user_id<>(select auth.uid()) then
   raise exception 'Invitation has already been used'; end if;
 if v_invite.linked_user_id is null then
   update public.omra_story_invites
   set linked_user_id=(select auth.uid()), claimed_at=now()
   where id=v_invite.id;
 end if;
 return v_invite.id;
end
$$;
revoke all on function public.omra_claim_story_invite(text) from public,anon;
grant execute on function public.omra_claim_story_invite(text) to authenticated;

create or replace function public.omra_revoke_story_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())
 ) then raise exception 'Admin access required' using errcode='42501'; end if;
 update public.omra_story_invites set revoked_at=now() where id=p_invite_id;
end
$$;
revoke all on function public.omra_revoke_story_invite(uuid) from public,anon;
grant execute on function public.omra_revoke_story_invite(uuid) to authenticated;

create table if not exists public.omra_story_stops (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.omra_story_invites(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  stop_key text not null check(char_length(stop_key) between 1 and 120),
  title text not null check(char_length(trim(title)) between 1 and 150),
  sequence integer not null default 0 check(sequence between 0 and 2000),
  visited_at timestamptz,
  note text not null default '' check(char_length(note)<=4000),
  photo_path text check(photo_path is null or char_length(photo_path)<=350),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(invite_id,stop_key)
);
create index if not exists omra_story_stops_owner_idx on public.omra_story_stops(owner_id);
alter table public.omra_story_stops enable row level security;
revoke all on public.omra_story_stops from anon,authenticated;
grant select,insert,update,delete on public.omra_story_stops to authenticated;
drop policy if exists omra_story_stops_owner_read on public.omra_story_stops;
create policy omra_story_stops_owner_read on public.omra_story_stops
 for select to authenticated using(
  owner_id=(select auth.uid()) and exists(
   select 1 from public.omra_story_invites i where i.id=invite_id
   and i.linked_user_id=(select auth.uid()) and i.revoked_at is null));
drop policy if exists omra_story_stops_owner_insert on public.omra_story_stops;
create policy omra_story_stops_owner_insert on public.omra_story_stops
 for insert to authenticated with check(
  owner_id=(select auth.uid()) and exists(
   select 1 from public.omra_story_invites i where i.id=invite_id
   and i.linked_user_id=(select auth.uid()) and i.revoked_at is null));
drop policy if exists omra_story_stops_owner_update on public.omra_story_stops;
create policy omra_story_stops_owner_update on public.omra_story_stops
 for update to authenticated
 using(owner_id=(select auth.uid()) and exists(
  select 1 from public.omra_story_invites i where i.id=invite_id and i.linked_user_id=(select auth.uid()) and i.revoked_at is null))
 with check(owner_id=(select auth.uid()) and exists(
  select 1 from public.omra_story_invites i where i.id=invite_id and i.linked_user_id=(select auth.uid()) and i.revoked_at is null));
drop policy if exists omra_story_stops_owner_delete on public.omra_story_stops;
create policy omra_story_stops_owner_delete on public.omra_story_stops
 for delete to authenticated using(owner_id=(select auth.uid()) and exists(
  select 1 from public.omra_story_invites i where i.id=invite_id and i.linked_user_id=(select auth.uid()) and i.revoked_at is null));

-- Optional private image storage. Not publicly listed or accessible.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('wv-omra-private','wv-omra-private',false,7340032,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=7340032,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists wv_omra_private_select on storage.objects;
create policy wv_omra_private_select on storage.objects for select to authenticated
 using(bucket_id='wv-omra-private' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists wv_omra_private_insert on storage.objects;
create policy wv_omra_private_insert on storage.objects for insert to authenticated
 with check(bucket_id='wv-omra-private' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists(select 1 from public.omra_story_invites i
    where i.id::text=(storage.foldername(name))[2]
    and i.linked_user_id=(select auth.uid()) and i.revoked_at is null));
drop policy if exists wv_omra_private_delete on storage.objects;
create policy wv_omra_private_delete on storage.objects for delete to authenticated
 using(bucket_id='wv-omra-private' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Admin-editable adhkar. Every new entry starts as a DRAFT.
create table if not exists public.omra_adhkar_custom(
 id uuid primary key default gen_random_uuid(),
 category text not null check(category in (
 'morning','evening','prayer','sleep','waking','travel','umra','home','mosque',
 'food','stress','healing','rain','istighfar','salawat','quran','other','fasting'
 )),
 title text not null check(char_length(trim(title)) between 2 and 120),
 body text not null check(char_length(trim(body)) between 5 and 3500),
 source text not null default '' check(char_length(source)<=250),
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.omra_adhkar_custom enable row level security;
revoke all on public.omra_adhkar_custom from anon,authenticated;
grant select on public.omra_adhkar_custom to anon,authenticated;
grant insert,update,delete on public.omra_adhkar_custom to authenticated;
drop policy if exists omra_custom_adhkar_public_select on public.omra_adhkar_custom;
create policy omra_custom_adhkar_public_select on public.omra_adhkar_custom
 for select to anon,authenticated using(is_published=true);
drop policy if exists omra_custom_adhkar_admin_select on public.omra_adhkar_custom;
create policy omra_custom_adhkar_admin_select on public.omra_adhkar_custom
 for select to authenticated using(exists(
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
drop policy if exists omra_custom_adhkar_admin_insert on public.omra_adhkar_custom;
create policy omra_custom_adhkar_admin_insert on public.omra_adhkar_custom
 for insert to authenticated with check(exists(
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
drop policy if exists omra_custom_adhkar_admin_update on public.omra_adhkar_custom;
create policy omra_custom_adhkar_admin_update on public.omra_adhkar_custom
 for update to authenticated using(exists(
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())))
 with check(exists(
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
drop policy if exists omra_custom_adhkar_admin_delete on public.omra_adhkar_custom;
create policy omra_custom_adhkar_admin_delete on public.omra_adhkar_custom
 for delete to authenticated using(exists(
  select 1 from public.omra_admins a where a.user_id=(select auth.uid())));

-- End. Existing public omra_programs and admin accounts are preserved.
