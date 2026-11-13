-- Run once in Supabase SQL Editor. Do not place passwords or secret keys here.
create table if not exists public.omra_admins(
 user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.omra_programs(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 3 and 160),
 start_date date not null,
 end_date date not null check(end_date >= start_date),
 airline text not null default '',
 route text not null default '',
 hotel text not null default '',
 description text not null default '',
 image_url text check(image_url is null or image_url ~ '^https://[^[:space:]]+$'),
 price_tnd numeric(10,2) check(price_tnd is null or price_tnd>=0),
 tag text not null default 'عمرة',
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create or replace function public.omra_touch_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now();return new;end
$$;
drop trigger if exists omra_timestamp on public.omra_programs;
create trigger omra_timestamp before update on public.omra_programs
for each row execute function public.omra_touch_timestamp();
alter table public.omra_admins enable row level security;
alter table public.omra_programs enable row level security;
revoke all on public.omra_admins from anon,authenticated;
revoke all on public.omra_programs from anon,authenticated;
grant select on public.omra_admins to authenticated;
grant select on public.omra_programs to anon,authenticated;
grant insert,update,delete on public.omra_programs to authenticated;
drop policy if exists admin_self_read on public.omra_admins;
create policy admin_self_read on public.omra_admins for select to authenticated
 using (user_id = (select auth.uid()));
drop policy if exists program_published_read on public.omra_programs;
create policy program_published_read on public.omra_programs for select to anon,authenticated
 using (is_published=true);
drop policy if exists program_admin_read on public.omra_programs;
create policy program_admin_read on public.omra_programs for select to authenticated
 using (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
drop policy if exists program_admin_insert on public.omra_programs;
create policy program_admin_insert on public.omra_programs for insert to authenticated
 with check (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
drop policy if exists program_admin_update on public.omra_programs;
create policy program_admin_update on public.omra_programs for update to authenticated
 using (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())))
 with check (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
drop policy if exists program_admin_delete on public.omra_programs;
create policy program_admin_delete on public.omra_programs for delete to authenticated
 using (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())));
-- After creating a Supabase Auth user, grant access separately in SQL editor:
-- insert into public.omra_admins(user_id) values('YOUR_AUTH_USER_UUID');
