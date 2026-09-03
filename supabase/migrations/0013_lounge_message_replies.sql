-- Makes "Ответить" a real, single-level reply (a reply can't itself be
-- replied to — keeps the feed a flat list of threads, not arbitrary
-- nesting). Owner's explicit request, beyond the source Figma design
-- like everything else added past the first port.
--
-- No new RLS policies needed: a reply is just another lounge_messages
-- row, author_id = auth.uid(), governed by the exact same
-- lounge_messages_member_insert / _author_update_own / _editor_all /
-- _author_select_own policies (0007, 0011) a top-level post already
-- uses — none of them look at parent_message_id.

alter table lounge_messages
  add column parent_message_id uuid references lounge_messages (id) on delete cascade;

create index lounge_messages_parent_idx on lounge_messages (parent_message_id) where deleted_at is null;
