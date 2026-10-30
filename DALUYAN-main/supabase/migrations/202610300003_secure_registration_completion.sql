-- Separate Supabase authentication from completed DALUYAN onboarding.
alter table public.profiles
  add column if not exists registration_completed boolean not null default false;

-- All existing policies that call this helper now require completed DALUYAN onboarding.
create or replace function public.has_account_access() returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.registration_completed)
    and (coalesce(auth.jwt()->>'aal', '') = 'aal2'
      or not exists (select 1 from auth.mfa_factors where user_id = auth.uid() and status = 'verified' and factor_type = 'totp'))
$$;

-- Existing profiles that already contain the required onboarding information remain active.
update public.profiles
set registration_completed = (
  username is not null
  and full_name is not null
  and birthdate is not null
  and terms_accepted_at is not null
  and privacy_version is not null
)
where registration_completed = false;

create or replace function public.prevent_registration_status_tampering()
returns trigger
language plpgsql
as $$
begin
  if new.registration_completed is distinct from old.registration_completed
     and coalesce(current_setting('daluyan.registration_completion', true), '') <> 'true' then
    raise exception 'Registration status is server controlled';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_registration_status_guard on public.profiles;
create trigger profiles_registration_status_guard
before update on public.profiles
for each row execute function public.prevent_registration_status_tampering();

-- The only client-callable path that can complete onboarding. The function validates
-- the required fields and writes the profile and interests atomically for auth.uid().
create or replace function public.complete_registration(registration jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_full_name text := nullif(trim(registration->>'full_name'), '');
  v_username text := lower(nullif(trim(registration->>'username'), ''));
  v_birthdate date := nullif(registration->>'birthdate', '')::date;
  terms_accepted boolean := coalesce((registration->>'terms_accepted')::boolean, false);
  recommendations boolean := coalesce((registration->>'recommendations')::boolean, false);
  value text;
begin
  if uid is null then raise exception 'You must be signed in to complete registration'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Registration profile is not available';
  end if;
  if v_username is null or v_username !~ '^[A-Za-z0-9._]{3,25}$' then raise exception 'Invalid username'; end if;
  if v_full_name is null or v_birthdate is null or v_birthdate > current_date then raise exception 'Complete your personal information'; end if;
  if not terms_accepted then raise exception 'You must accept the Terms of Service and Privacy Policy'; end if;
  if exists (select 1 from public.profiles p where lower(p.username) = v_username and p.id <> uid) then raise exception 'That username is already in use'; end if;

  perform set_config('daluyan.registration_completion', 'true', true);
  update public.profiles set
    username = v_username,
    display_name = left(v_full_name, 80),
    full_name = v_full_name,
    first_name = nullif(trim(registration->>'first_name'), ''),
    middle_name = nullif(trim(registration->>'middle_name'), ''),
    last_name = nullif(trim(registration->>'last_name'), ''),
    birthdate = v_birthdate,
    gender = nullif(trim(registration->>'gender'), ''),
    phone_number = nullif(trim(registration->>'phone_number'), ''),
    avatar_type = coalesce(nullif(registration->>'avatar_type', ''), 'default'),
    avatar_id = nullif(registration->>'avatar_id', ''),
    travel_styles = coalesce(array(select jsonb_array_elements_text(coalesce(registration->'travel_styles', '[]'::jsonb))), '{}'),
    preferred_activities = coalesce(array(select jsonb_array_elements_text(coalesce(registration->'activities', '[]'::jsonb))), '{}'),
    travel_budget = nullif(registration->>'budget', ''),
    recommendations_consent = recommendations,
    terms_version = '0.1-draft',
    terms_accepted_at = now(),
    privacy_version = '0.1-draft',
    recommendations_consent_at = case when recommendations then now() else null end,
    registration_completed = true,
    updated_at = now()
  where id = uid;

  delete from public.profile_interests where profile_id = uid;
  for value in select jsonb_array_elements_text(coalesce(registration->'spots', '[]'::jsonb)) loop
    insert into public.profile_interests(profile_id, category, value) values(uid, 'spot', value);
  end loop;
  for value in select jsonb_array_elements_text(coalesce(registration->'hobbies', '[]'::jsonb)) loop
    insert into public.profile_interests(profile_id, category, value) values(uid, 'hobby', value);
  end loop;
  for value in select jsonb_array_elements_text(coalesce(registration->'travel_styles', '[]'::jsonb)) loop
    insert into public.profile_interests(profile_id, category, value) values(uid, 'travel_style', value);
  end loop;
  return true;
end;
$$;

revoke all on function public.complete_registration(jsonb) from public, anon;
grant execute on function public.complete_registration(jsonb) to authenticated;

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() and public.has_account_access() and registration_completed)
  with check (id = auth.uid() and public.has_account_access() and registration_completed);

drop policy if exists rini_conversations_own on public.rini_conversations;
create policy rini_conversations_own on public.rini_conversations for all to authenticated
  using (user_id = auth.uid() and public.has_account_access())
  with check (user_id = auth.uid() and public.has_account_access());
drop policy if exists rini_messages_own on public.rini_messages;
create policy rini_messages_own on public.rini_messages for all to authenticated
  using (user_id = auth.uid() and public.has_account_access())
  with check (
    user_id = auth.uid()
    and public.has_account_access()
    and exists (
      select 1 from public.rini_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );
