-- Registration gains a second path (server/actions/lounge-auth.ts,
-- components/lounge/lounge-register-form.tsx): with an invite code, as
-- before, tree-editing rights are immediate; without one, the visitor
-- explains their family connection instead, gets a real account and
-- lounge-posting rights right away, but can't add people to the tree
-- until an editor approves (app/edit/page.tsx).
--
-- This lives in its own table, not as columns on lounge_profiles,
-- because lounge_profiles is publicly readable
-- (lounge_profiles_public_select, 0007_add_lounge.sql — a message's
-- author name is part of the public feed) — email and the relation
-- explanation must not be exposed the same way.
create type lounge_tree_access_status as enum ('granted', 'pending', 'rejected');

create table lounge_tree_access (
  user_id uuid primary key references lounge_profiles (user_id) on delete cascade,
  email text not null,
  relation_note text null,
  status lounge_tree_access_status not null default 'granted',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references editors (user_id) on delete set null
);

alter table lounge_tree_access enable row level security;

create policy "lounge_tree_access_editor_all" on lounge_tree_access
  for all using (is_editor()) with check (is_editor());

-- Backfill every existing member (editors included) as already granted
-- — matches what was true of them before this migration.
insert into lounge_tree_access (user_id, email, status)
select lp.user_id, u.email, 'granted'
from lounge_profiles lp
join auth.users u on u.id = lp.user_id
on conflict (user_id) do nothing;

-- security definer so the tree-contribution policies below can check
-- this (editor-only-readable) table regardless of the calling member's
-- own RLS visibility into it — same pattern as is_editor()/
-- touches_own_person()/person_belongs_to_member().
create or replace function has_tree_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from lounge_tree_access where user_id = uid and status = 'granted'
  );
$$;

-- Same trigger that already provisions lounge_profiles on signup
-- (0009_lounge_member_names.sql) — now also provisions
-- lounge_tree_access. `new` here is the auth.users row itself, so
-- `new.email` is already at hand with no admin API needed.
create or replace function handle_new_lounge_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'lounge_first_name' then
    insert into lounge_profiles (user_id, first_name, last_name)
    values (
      new.id,
      new.raw_user_meta_data ->> 'lounge_first_name',
      coalesce(new.raw_user_meta_data ->> 'lounge_last_name', '')
    )
    on conflict (user_id) do nothing;

    insert into lounge_tree_access (user_id, email, status, relation_note)
    values (
      new.id,
      new.email,
      coalesce((new.raw_user_meta_data ->> 'lounge_tree_access_status')::lounge_tree_access_status, 'granted'),
      new.raw_user_meta_data ->> 'lounge_relation_note'
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- The three member-contribution policies from 0008_add_tree_contributions.sql —
-- unchanged except for the added has_tree_access() check. Lounge
-- posting (lounge_messages_member_insert) is deliberately untouched:
-- writing in the lounge stays available to every member immediately,
-- with or without tree access.
drop policy "people_member_insert" on people;
create policy "people_member_insert" on people
  for insert with check (
    created_by = auth.uid()
    and has_tree_access(auth.uid())
  );

drop policy "relationships_member_insert" on relationships;
create policy "relationships_member_insert" on relationships
  for insert with check (
    has_tree_access(auth.uid())
    and touches_own_person(from_person_id, to_person_id)
  );

drop policy "places_member_insert" on places;
create policy "places_member_insert" on places
  for insert with check (has_tree_access(auth.uid()));
