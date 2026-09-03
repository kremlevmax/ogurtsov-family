-- Root-cause fix for "delete still doesn't work" (0008/0007's own
-- .select()/{count:'exact'} workarounds both still failed): the public
-- SELECT policies on people/relationships/lounge_messages are all
-- `deleted_at is null`. The instant a plain (non-editor) actor's own
-- UPDATE sets deleted_at, PostgREST's RETURNING/count evaluation for
-- THAT SAME REQUEST re-runs the SELECT policy and finds the row
-- invisible — not just to a later page load, but to the very request
-- that just wrote it. `{count:'exact'}` doesn't sidestep this either;
-- it still goes through RETURNING under the hood. Editors never hit
-- this because their "for all" policies already grant unconditional
-- SELECT. The actual fix: give the acting member the same "I can see
-- my own row regardless of deleted_at" visibility editors already
-- have implicitly, so their own UPDATE's RETURNING/count is never
-- empty for a row they just legitimately touched.

create policy "people_own_select" on people
  for select using (created_by = auth.uid());

create policy "relationships_own_select" on relationships
  for select using (touches_own_person(from_person_id, to_person_id));

create policy "lounge_messages_author_select_own" on lounge_messages
  for select using (auth.uid() = author_id);
