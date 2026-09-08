-- Lets a signed-in member check their own tree-access status
-- client/server-side (server/auth/require-lounge-member.ts) so the UI
-- can hide "Добавить человека"/quick-relation buttons before they hit
-- the has_tree_access() check in people_member_insert/
-- relationships_member_insert/places_member_insert
-- (0021_lounge_tree_access.sql) and get a confusing RLS error instead.
--
-- No-arg wrapper around has_tree_access(uid) so it can only ever answer
-- for the caller's own auth.uid() — exposing has_tree_access(uid) itself
-- as an RPC would let anyone probe an arbitrary user's tree-access
-- status by guessing their id. lounge_tree_access itself stays
-- editor-only (lounge_tree_access_editor_all) since it also holds
-- email/relation-note text this function never touches.
create or replace function current_user_has_tree_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select has_tree_access(auth.uid());
$$;
