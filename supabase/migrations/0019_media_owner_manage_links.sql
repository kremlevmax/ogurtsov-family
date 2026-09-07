-- Lets whoever uploaded a photo/document link/unlink it to/from ANY
-- person, not just a person they also created themselves
-- (0015_member_person_photos.sql only covers "I own the person").
-- Additive — Postgres OR's multiple policies for the same command
-- together, so this only ever grants more, never replaces the
-- existing person-ownership-based policies.
create policy "person_media_media_owner_insert" on person_media
  for insert with check (
    exists (select 1 from media where id = media_id and created_by = auth.uid())
  );

create policy "person_media_media_owner_delete" on person_media
  for delete using (
    exists (select 1 from media where id = media_id and created_by = auth.uid())
  );
