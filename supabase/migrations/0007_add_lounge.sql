-- "Семейная гостиная" (/lounge): registration-gated public message
-- board. Deliberate departure from CLAUDE.md's "no public registration"
-- MVP default, per the owner's explicit later decision (docs/DECISIONS.md):
-- anyone can register (server-side invite-code gate, not stored in the
-- DB — see LOUNGE_INVITE_CODE in .env.example) and post; an author can
-- edit/soft-delete their own message; editors (is_editor(), already
-- defined in 0001_init.sql) can moderate any message, same "for all"
-- shape as every other editor-owned table here.

-- ============================================================
-- lounge_profiles — display name for registered lounge members.
-- Deliberately separate from `editors`: every lounge member gets a row
-- here, but only the two editors are ever in `editors`.
-- ============================================================

create table lounge_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table lounge_profiles enable row level security;

-- Public: message authorship (display name) is part of the public feed.
create policy "lounge_profiles_public_select" on lounge_profiles
  for select using (true);

create policy "lounge_profiles_self_update" on lounge_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-provisioned on signup by handle_new_lounge_member() below, from
-- the `lounge_display_name` passed as auth.signUp() user metadata — not
-- from a direct client insert, so no insert policy is needed here.
create or replace function handle_new_lounge_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'lounge_display_name' then
    insert into lounge_profiles (user_id, display_name)
    values (new.id, new.raw_user_meta_data ->> 'lounge_display_name')
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_lounge
  after insert on auth.users
  for each row execute function handle_new_lounge_member();

-- The two existing editors can already post as themselves without a
-- separate registration step.
insert into lounge_profiles (user_id, display_name)
select user_id, display_name from editors
on conflict (user_id) do nothing;

-- ============================================================
-- lounge_messages
-- ============================================================

create type lounge_topic as enum ('news', 'memories', 'search', 'thanks');

create table lounge_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  topic lounge_topic not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index lounge_messages_feed_idx on lounge_messages (created_at desc) where deleted_at is null;
create index lounge_messages_topic_idx on lounge_messages (topic) where deleted_at is null;
create index lounge_messages_author_idx on lounge_messages (author_id) where deleted_at is null;

create trigger lounge_messages_set_updated_at
  before update on lounge_messages
  for each row execute function set_updated_at();

alter table lounge_messages enable row level security;

create policy "lounge_messages_public_select" on lounge_messages
  for select using (deleted_at is null);

-- Must be a registered lounge member (row in lounge_profiles), posting
-- as themselves.
create policy "lounge_messages_member_insert" on lounge_messages
  for insert with check (
    auth.uid() = author_id
    and exists (select 1 from lounge_profiles where user_id = auth.uid())
  );

-- Author edits/soft-deletes their own message (soft-delete = an update
-- setting deleted_at, matching the project's no-hard-delete convention —
-- CLAUDE.md 7.2/17).
create policy "lounge_messages_author_update_own" on lounge_messages
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

-- Editors moderate any message (same shape as people_editor_all etc.).
create policy "lounge_messages_editor_all" on lounge_messages
  for all using (is_editor()) with check (is_editor());
