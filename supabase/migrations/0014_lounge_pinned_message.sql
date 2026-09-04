-- Lets an editor (the owner or the owner's mother — the only two rows
-- in `editors`) pin a single announcement banner above the lounge feed:
-- create it, edit its text, or remove it again. Owner's explicit
-- request.
--
-- Singleton table, same shape as site_settings (0001_init.sql) — the
-- app never inserts/deletes this row itself, only UPDATEs `body`
-- between a real value and null. A null body means "nothing pinned
-- right now": components/lounge/pinned-message-editor.tsx hides the
-- banner entirely for a plain visitor in that case, which is what
-- covers "delete" here — there's nothing else for a singleton row to
-- delete.

create table lounge_pinned_message (
  id boolean primary key default true,
  body text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  constraint lounge_pinned_message_singleton check (id)
);

insert into lounge_pinned_message (id, body) values (true, null);

create trigger lounge_pinned_message_set_updated_at
  before update on lounge_pinned_message
  for each row execute function set_updated_at();

alter table lounge_pinned_message enable row level security;

-- Public: the pinned banner is part of the public feed (CLAUDE.md 3.1).
create policy "lounge_pinned_message_public_select" on lounge_pinned_message
  for select using (true);

-- Only the two editors (is_editor(), 0001_init.sql) may change it —
-- same shape as site_settings_editor_update.
create policy "lounge_pinned_message_editor_update" on lounge_pinned_message
  for update using (is_editor()) with check (is_editor());
