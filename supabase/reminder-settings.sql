-- Walid Voyages | Run ONCE in Supabase SQL Editor.
-- Extends the already installed omra_programs / omra_admins schema.

alter table public.omra_programs add column if not exists published_at timestamptz;
update public.omra_programs
set published_at=coalesce(updated_at,created_at,now())
where is_published=true and published_at is null;

create or replace function public.omra_record_publish_time()
returns trigger language plpgsql set search_path = '' as $$
begin
 if TG_OP='INSERT' then
  if new.is_published then new.published_at=now(); else new.published_at=null; end if;
 elsif TG_OP='UPDATE' then
  if new.is_published and not old.is_published then
   new.published_at=now();
  elsif not new.is_published then
   new.published_at=null;
  end if;
 end if;
 return new;
end
$$;
drop trigger if exists omra_publish_timestamp on public.omra_programs;
create trigger omra_publish_timestamp before insert or update on public.omra_programs
for each row execute function public.omra_record_publish_time();

create table if not exists public.omra_reminder_settings(
 id integer primary key default 1 check(id=1),
 enabled boolean not null default true,
 morning_enabled boolean not null default true,
 morning_time time without time zone not null default '08:00',
 evening_enabled boolean not null default true,
 evening_time time without time zone not null default '18:30',
 after_prayer_enabled boolean not null default true,
 after_prayer_delay_minutes integer not null default 10 check(after_prayer_delay_minutes between 0 and 120),
 before_travel_enabled boolean not null default true,
 before_travel_days integer not null default 3 check(before_travel_days between 1 and 30),
 before_travel_time time without time zone not null default '10:00',
 during_travel_enabled boolean not null default true,
 during_travel_time time without time zone not null default '09:00',
 general_enabled boolean not null default true,
 general_interval_minutes integer not null default 120 check(general_interval_minutes between 30 and 1440),
 quiet_from time without time zone not null default '23:00',
 quiet_until time without time zone not null default '07:00',
 updated_at timestamptz not null default now()
);
insert into public.omra_reminder_settings(id) values(1) on conflict(id) do nothing;

alter table public.omra_reminder_settings enable row level security;
revoke all on public.omra_reminder_settings from anon,authenticated;
grant select on public.omra_reminder_settings to anon,authenticated;
grant update on public.omra_reminder_settings to authenticated;

drop policy if exists "omra_settings_public_read" on public.omra_reminder_settings;
create policy "omra_settings_public_read" on public.omra_reminder_settings
for select to anon,authenticated using (true);

drop policy if exists "omra_settings_admin_update" on public.omra_reminder_settings;
create policy "omra_settings_admin_update" on public.omra_reminder_settings
for update to authenticated
using (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())))
with check (exists(select 1 from public.omra_admins a where a.user_id=(select auth.uid())));

-- No public UPDATE/INSERT/DELETE policy. Only authorized admins can UPDATE.
-- Times are daily clock times in Africa/Tunis, except after-prayer timings
-- which follow the city selected by the individual user.
