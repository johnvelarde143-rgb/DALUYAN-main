-- Profile timeline support: keep existing posts/media/interactions and add the
-- visibility and category fields required by the profile composer.
alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts drop constraint if exists posts_visibility_check;
alter table public.posts add constraint posts_visibility_check check (visibility in ('public','private'));

alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check check (
  category is null or category in (
    'Cleanliness','Pricing','Transport','Accessibility','Safety','Facilities',
    'Satisfaction','Tourist experience','Travel Experience','Tourist Spot',
    'Cultural Experience','Festival','Travel Tips'
  )
);

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (
  (
    post_type <> 'feedback'
    and moderation_status = 'published'
    and (visibility = 'public' or author_id = auth.uid())
  )
  or (author_id = auth.uid() and has_account_access())
  or is_admin()
);

create index if not exists posts_visibility_feed on public.posts(visibility, created_at desc);

-- The existing interaction RPC is SECURITY DEFINER, so it must repeat the
-- visibility boundary instead of relying on the table SELECT policy.
create or replace function public.interact(target uuid, kind text, reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare p posts;
begin
  if not has_account_access() then raise exception 'Sign in and complete any enrolled MFA challenge'; end if;
  select * into p from posts
    where id=target
      and post_type in ('social','review','comment','announcement')
      and moderation_status='published'
      and (visibility='public' or author_id=auth.uid());
  if p.id is null then raise exception 'Post unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,2));
  if (select count(*) from activity_events where actor_id=auth.uid() and created_at>now()-interval '1 minute')>=20 then raise exception 'Interaction rate limit'; end if;
  if kind='reaction' then
    if exists(select 1 from activity_events where actor_id=auth.uid() and post_id=target and event_type='reaction') then
      delete from activity_events where actor_id=auth.uid() and post_id=target and event_type='reaction';
    else
      insert into activity_events(actor_id,post_id,event_type) values(auth.uid(),target,'reaction');
      if p.author_id<>auth.uid() then
        insert into activity_events(actor_id,recipient_id,post_id,event_type,payload)
        values(auth.uid(),p.author_id,target,'notification',jsonb_build_object('message','Someone appreciated your post','url','/posts/'||target));
      end if;
    end if;
  elsif kind='report' then
    if length(trim(reason))<5 or length(reason)>1000 then raise exception 'Give a report reason (5–1000 characters)'; end if;
    if (select count(*) from activity_events where actor_id=auth.uid() and event_type='report' and created_at>now()-interval '1 hour')>=10 then raise exception 'Report rate limit'; end if;
    insert into activity_events(actor_id,post_id,event_type,payload) values(auth.uid(),target,'report',jsonb_build_object('reason',reason));
  else raise exception 'Unsupported event'; end if;
end $$;
