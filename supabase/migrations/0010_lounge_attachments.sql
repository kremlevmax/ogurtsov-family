-- Lets a registered lounge member attach one image/file to their own
-- message, reusing the exact same presign/finalize/validation pipeline
-- as the editor media flow (server/repositories/media.ts, lib/r2/objects.ts,
-- lib/validation/media.ts) — just with a member-scoped auth gate and no
-- person to link to. Owner's explicit follow-up request after testing
-- (docs/DECISIONS.md).

-- Same reasoning as 0008_add_tree_contributions.sql: these were FK'd to
-- editors(user_id), which would reject a plain member's id outright.
alter table media drop constraint media_created_by_fkey;
alter table media add constraint media_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table media drop constraint media_updated_by_fkey;
alter table media add constraint media_updated_by_fkey
  foreign key (updated_by) references auth.users (id) on delete set null;

alter table pending_uploads drop constraint pending_uploads_editor_id_fkey;
alter table pending_uploads add constraint pending_uploads_editor_id_fkey
  foreign key (editor_id) references auth.users (id) on delete cascade;

-- pending_uploads_editor_own (0001_init.sql) already just compares
-- editor_id = auth.uid() — no table-specific check, so no new policy
-- is needed there once the FK allows a member's id through.

create policy "media_member_insert" on media
  for insert with check (
    created_by = auth.uid()
    and exists (select 1 from lounge_profiles where user_id = auth.uid())
  );

-- One optional image per message — the source design only ever showed
-- a single "＋ Добавить фото или файл" button, not a gallery.
alter table lounge_messages
  add column image_media_id uuid references media (id) on delete set null;
