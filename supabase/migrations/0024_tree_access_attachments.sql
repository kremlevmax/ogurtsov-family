-- "Прикрепить материалы" on the "Подтверждение родства" form
-- (RegistrationProject v1.0, Documents/05) — multiple optional files
-- (photos/documents/letters) a member can attach to their tree-access
-- request. Reuses the exact same presign/finalize/validation pipeline
-- as lounge message attachments (0010_lounge_attachments.sql,
-- server/actions/lounge-attachments.ts) — each file becomes its own
-- `media` row (unlisted, created_by = the member); this table only
-- records which unlisted media rows belong to which request.
--
-- A join table rather than an array column on lounge_tree_access:
-- media rows already carry all the file metadata (size, mime,
-- original filename) an editor needs to review an attachment, so this
-- table only needs to say "this media belongs to this request".
create table lounge_tree_access_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references lounge_tree_access (user_id) on delete cascade,
  media_id uuid not null references media (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, media_id)
);

alter table lounge_tree_access_attachments enable row level security;

-- A member attaches files to their own request. No extra status check
-- (unlike lounge_tree_access_own_insert/own_resubmit) — attaching a
-- file doesn't grant anything by itself, only the editor's approval of
-- the request itself does.
create policy "lounge_tree_access_attachments_own_insert" on lounge_tree_access_attachments
  for insert with check (user_id = auth.uid());

-- A member can see their own attachments (e.g. to show "3 файла уже
-- прикреплены" on a resubmit).
create policy "lounge_tree_access_attachments_own_select" on lounge_tree_access_attachments
  for select using (user_id = auth.uid());

-- Editors review these alongside the request itself (app/edit/page.tsx).
create policy "lounge_tree_access_attachments_editor_select" on lounge_tree_access_attachments
  for select using (is_editor());
