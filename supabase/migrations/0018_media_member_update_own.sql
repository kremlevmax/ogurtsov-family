-- Lets a member update (only) the media rows they created themselves —
-- needed so a member can edit their own photo/document caption later,
-- not just at upload time. Editors already have full access via
-- media_editor_all (0001_init.sql).
create policy "media_member_update_own" on media
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());
