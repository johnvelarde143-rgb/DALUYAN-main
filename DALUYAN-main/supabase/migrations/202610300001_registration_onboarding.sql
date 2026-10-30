-- DALUYAN registration onboarding: profile data, preferences, and avatar storage.
alter table public.profiles
  add column if not exists username text,
  add column if not exists full_name text,
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists birthdate date,
  add column if not exists gender text,
  add column if not exists phone_number text,
  add column if not exists avatar_type text not null default 'default',
  add column if not exists avatar_id text,
  add column if not exists avatar_storage_path text,
  add column if not exists travel_styles text[] not null default '{}',
  add column if not exists recommendations_consent boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9._]{3,25}$');
alter table public.profiles drop constraint if exists profiles_avatar_type;
alter table public.profiles add constraint profiles_avatar_type check (avatar_type in ('default','avatar','upload'));
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username)) where username is not null;
create index if not exists profiles_recommendations on public.profiles using gin(travel_styles);

create table if not exists public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check(category in ('spot','hobby','travel_style')),
  value text not null check(char_length(value) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key(profile_id, category, value)
);
alter table public.profile_interests enable row level security;
drop policy if exists profile_interests_self on public.profile_interests;
create policy profile_interests_self on public.profile_interests for all to authenticated
  using(profile_id = auth.uid() and public.has_account_access())
  with check(profile_id = auth.uid() and public.has_account_access());
revoke all on public.profile_interests from anon;
grant select, insert, update, delete on public.profile_interests to authenticated;

create or replace function public.new_profile() returns trigger
language plpgsql security definer set search_path=public as $$
declare meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); item text;
begin
  insert into public.profiles(id, display_name, username, full_name, first_name, middle_name, last_name, birthdate, gender, phone_number, avatar_type, avatar_id, travel_styles, recommendations_consent)
  values(new.id, left(coalesce(nullif(meta->>'display_name',''),'Traveler'),80), lower(nullif(meta->>'username','')), nullif(meta->>'full_name',''), nullif(meta->>'first_name',''), nullif(meta->>'middle_name',''), nullif(meta->>'last_name',''), nullif(meta->>'birthdate','')::date, nullif(meta->>'gender',''), nullif(meta->>'phone_number',''), coalesce(nullif(meta->>'avatar_type',''),'default'), nullif(meta->>'avatar_id',''), coalesce(array(select jsonb_array_elements_text(coalesce(meta->'travel_styles','[]'::jsonb))), '{}'), coalesce((meta->>'recommendations')::boolean, true))
  on conflict(id) do update set display_name=excluded.display_name, username=excluded.username, full_name=excluded.full_name, first_name=excluded.first_name, middle_name=excluded.middle_name, last_name=excluded.last_name, birthdate=excluded.birthdate, gender=excluded.gender, phone_number=excluded.phone_number, avatar_type=excluded.avatar_type, avatar_id=excluded.avatar_id, travel_styles=excluded.travel_styles, recommendations_consent=excluded.recommendations_consent, updated_at=now();
  insert into public.user_roles(user_id) values(new.id) on conflict(user_id) do nothing;
  for item in select jsonb_array_elements_text(coalesce(meta->'spots','[]'::jsonb)) loop insert into public.profile_interests values(new.id,'spot',item) on conflict do nothing; end loop;
  for item in select jsonb_array_elements_text(coalesce(meta->'hobbies','[]'::jsonb)) loop insert into public.profile_interests values(new.id,'hobby',item) on conflict do nothing; end loop;
  return new;
end $$;

drop trigger if exists auth_profile on auth.users;
create trigger auth_profile after insert on auth.users for each row execute function public.new_profile();

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid() and public.has_account_access()) with check(id=auth.uid() and public.has_account_access());
grant select, update on public.profiles to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects for update to authenticated
using(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.has_account_access())
with check(bucket_id='avatars' and (storage.foldername(name))[1]=auth.uid()::text and public.has_account_access());

create or replace function public.touch_profile() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_profile();
