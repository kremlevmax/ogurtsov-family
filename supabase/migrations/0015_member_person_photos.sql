-- Lets a member upload and manage photos for a person THEY created
-- (people.created_by = auth.uid(), same ownership model as
-- 0008_add_tree_contributions.sql) — owner's explicit follow-up
-- request: members should be able to upload photos of their relatives
-- when adding or editing them in the tree, not just add the person's
-- name/dates.
--
-- media_member_insert (0010_lounge_attachments.sql) already lets any
-- lounge member insert their own `media` row — that policy predates
-- this feature (it was for lounge chat attachments) but its check
-- (created_by = auth.uid() + is a lounge member) is exactly what a
-- photo upload needs too, so it's reused as-is. What was missing is
-- linking that media to a person: person_media only had
-- person_media_editor_all (0001_init.sql) before this.

create or replace function person_belongs_to_member(target_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from people
    where id = target_person_id and created_by = auth.uid()
  );
$$;

-- Insert: only a photo the member uploaded themselves (media.created_by
-- = auth.uid(), enforced by media_member_insert at insert time), and
-- only onto a person they created — not "attach any existing file to
-- my person", which stays an editor-only tool (components/forms/link-existing-media.tsx).
create policy "person_media_member_insert_own_person" on person_media
  for insert with check (
    person_belongs_to_member(person_id)
    and exists (select 1 from media where id = media_id and created_by = auth.uid())
  );

-- Update: lets the member pick/change which of their person's photos
-- is the profile portrait (server/repositories/media.ts's
-- setProfilePhoto/unsetProfilePhoto) — scoped by the person, not the
-- media's uploader, so it still works if an editor also added a photo
-- to a member's person.
create policy "person_media_member_update_own_person" on person_media
  for update using (person_belongs_to_member(person_id)) with check (person_belongs_to_member(person_id));

-- Delete: unlinks a photo from the member's own person (the `media`
-- row itself is left in place, unlinked — same tolerance as the
-- editor's own unlinkMediaFromPerson, CLAUDE.md 13 restore-safety).
create policy "person_media_member_delete_own_person" on person_media
  for delete using (person_belongs_to_member(person_id));
