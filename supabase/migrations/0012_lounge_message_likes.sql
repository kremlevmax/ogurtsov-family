-- Makes "♡ Поддержать" (renamed to "Нравится" in the UI) a real like,
-- one per member per message. Owner's explicit request — the source
-- Figma design never depicted a reaction count at all (FIGMA_NOTES.md
-- in the original handoff), so this is deliberately beyond it, same as
-- everything else added to the lounge past the first port.

create table lounge_message_likes (
  message_id uuid not null references lounge_messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index lounge_message_likes_message_idx on lounge_message_likes (message_id);

alter table lounge_message_likes enable row level security;

-- Public: the like count on a message is part of the public feed,
-- same as the message itself (CLAUDE.md 3.1).
create policy "lounge_message_likes_public_select" on lounge_message_likes
  for select using (true);

-- Any registered member can like as themselves — same membership
-- check as posting a message (lounge_messages_member_insert, 0007).
create policy "lounge_message_likes_member_insert" on lounge_message_likes
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from lounge_profiles where user_id = auth.uid())
  );

-- Unliking is just removing your own row — no editor override needed,
-- there's nothing here for editors to moderate the way a message body
-- needs it.
create policy "lounge_message_likes_own_delete" on lounge_message_likes
  for delete using (user_id = auth.uid());
