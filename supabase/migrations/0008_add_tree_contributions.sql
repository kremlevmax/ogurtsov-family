-- Lets any registered site member (lounge_profiles — 0007_add_lounge.sql,
-- which already covers the two editors too) add a person to the tree and
-- edit/soft-delete the ones they added themselves. Editors keep full
-- control over everyone's, unchanged (people_editor_all/relationships_editor_all,
-- 0001_init.sql). A deliberate, explicit owner decision that widens
-- CLAUDE.md's original "only two editors write" model — see
-- docs/DECISIONS.md for the reasoning and the deliberate relationship
-- rule below.

-- `created_by`/`updated_by` were FK'd to `editors(user_id)`, which would
-- reject a contributor's own id outright. Widened to auth.users(id) —
-- editors are already a subset of auth.users, so every existing value
-- still satisfies the broader constraint.
alter table people drop constraint people_created_by_fkey;
alter table people add constraint people_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table people drop constraint people_updated_by_fkey;
alter table people add constraint people_updated_by_fkey
  foreign key (updated_by) references auth.users (id) on delete set null;

alter table relationships drop constraint relationships_created_by_fkey;
alter table relationships add constraint relationships_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table relationships drop constraint relationships_updated_by_fkey;
alter table relationships add constraint relationships_updated_by_fkey
  foreign key (updated_by) references auth.users (id) on delete set null;

-- ============================================================
-- people — member insert/update-own, on top of the existing
-- people_public_select and people_editor_all (0001_init.sql).
-- ============================================================

create policy "people_member_insert" on people
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from lounge_profiles where user_id = auth.uid())
  );

create policy "people_member_update_own" on people
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

-- ============================================================
-- relationships — a member may create/edit/soft-delete a relationship
-- as long as at least one side is a person THEY created. This is
-- deliberately about the endpoint people, not about who created the
-- relationship row itself: it's what lets deleting your own person
-- cleanly soft-delete every relationship attached to them (even ones an
-- editor added connecting your person to the wider tree), while still
-- stopping a member from inventing/editing a relationship between two
-- people neither of which they added.
-- ============================================================

create or replace function touches_own_person(from_id uuid, to_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from people
    where id in (from_id, to_id) and created_by = auth.uid()
  );
$$;

create policy "relationships_member_insert" on relationships
  for insert with check (
    exists (select 1 from lounge_profiles where user_id = auth.uid())
    and touches_own_person(from_person_id, to_person_id)
  );

create policy "relationships_member_manage" on relationships
  for update
  using (touches_own_person(from_person_id, to_person_id))
  with check (touches_own_person(from_person_id, to_person_id));

-- ============================================================
-- places — findOrCreatePlaceId() (server/repositories/places.ts) needs
-- to insert a not-yet-seen place name for a member's own person, same
-- as it already does for editors (places_editor_all, 0001_init.sql).
-- created_by isn't stamped by that function, so no ownership check is
-- needed here beyond "is a registered member".
-- ============================================================

create policy "places_member_insert" on places
  for insert with check (exists (select 1 from lounge_profiles where user_id = auth.uid()));
