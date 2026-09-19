-- Owner decision (2026-09-18, docs/DECISIONS.md): the invite-code
-- registration path is removed entirely. Every new member registers
-- the same way (name, email, password) and starts as a plain lounge
-- member with no tree-editing rights. "Подтверждение родства" becomes
-- its own action the member takes afterwards (server/actions/
-- tree-access-request.ts), not something bundled into signup.
--
-- handle_new_lounge_member() (0009_lounge_member_names.sql,
-- 0021_lounge_tree_access.sql) stops provisioning lounge_tree_access —
-- a fresh member gets only their lounge_profiles row now. No
-- lounge_tree_access row exists at all until the member submits a
-- relation-confirmation request themselves.
create or replace function handle_new_lounge_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'lounge_first_name' then
    insert into lounge_profiles (user_id, first_name, last_name)
    values (
      new.id,
      new.raw_user_meta_data ->> 'lounge_first_name',
      coalesce(new.raw_user_meta_data ->> 'lounge_last_name', '')
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- lounge_tree_access was editor-only (lounge_tree_access_editor_all,
-- 0021_lounge_tree_access.sql) — a member couldn't see or create their
-- own row. Three narrow self-service policies, additive to the
-- existing editor-all policy:
--
-- 1. A member can see their own row (so the UI can say "заявка на
--    рассмотрении" / "в подтверждении отказано" instead of showing the
--    form again with no memory of what happened).
create policy "lounge_tree_access_own_select" on lounge_tree_access
  for select using (user_id = auth.uid());

-- 2. A member can create their own request, but only ever landing in
--    'pending' — never 'granted'. Only an editor (existing
--    lounge_tree_access_editor_all policy) can move a row to 'granted'.
create policy "lounge_tree_access_own_insert" on lounge_tree_access
  for insert with check (user_id = auth.uid() and status = 'pending');

-- 3. A member whose request was rejected can submit a new one (per
--    docs/DECISIONS.md: "может повторно подать заявку после получения
--    новых сведений"). Only reachable from 'rejected', and only ever
--    back to 'pending' — a member can never touch a 'granted' row or
--    self-approve.
create policy "lounge_tree_access_own_resubmit" on lounge_tree_access
  for update
  using (user_id = auth.uid() and status = 'rejected')
  with check (user_id = auth.uid() and status = 'pending');
